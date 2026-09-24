import path from 'path';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { documents } from '../db/schema';
import { ocrService } from './ocrService';
import { nlpService } from './nlpService';
import { v4 as uuidv4 } from 'uuid';
import { chunkingService, ChunkMetadata } from './chunkingService';
import { upsertVector } from './qdrantService';
import { mapEventTypeToEnum, mapSeverityToEnum } from '../utils/drillingTerms';
import { operational_events, wells } from '../db/schema';
import { or } from 'drizzle-orm';

export class DocumentService {
  /**
   * Processes a document (PDF, TXT, etc.):
   * 1. Extracts text via OCR/PDF parsing
   * 2. Chunks the text
   * 3. Extracts NLP entities for metadata
   * 4. Embeds & indexes chunks in Qdrant
   * 5. Updates MySQL document status
   */
  public async processDocument(documentId: string): Promise<void> {
    try {
      // 1. Fetch document record
      const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
      if (!doc) {
        throw new Error(`Document ${documentId} not found`);
      }
      
      // reportService stores paths relative to the backend working directory.
      // Avoid resolving uploads/uploads/... for files written by multer.
      const filePath = path.isAbsolute(doc.file_path)
        ? doc.file_path
        : path.resolve(process.cwd(), doc.file_path);

      // Update status to processing
      await db.update(documents).set({ status: 'processing', processing_checkpoint: 'extracting', processing_error: null }).where(eq(documents.id, documentId));

      // 2. Extract text
      const extraction = await ocrService.extractTextWithMethod(filePath);
      const rawText = extraction.text;
      console.log(`Document ${documentId}: ${extraction.method} extraction succeeded (${rawText.length} characters).`);
      if (!rawText.trim()) throw new Error('No text could be extracted from the document.');

      if (!doc.well_id) {
        const wellRows = await db.select({ id: wells.id, name: wells.name, well_number: wells.well_number }).from(wells);
        const normalizedText = rawText.toLowerCase();
        const matchedWell = wellRows.find((well) =>
          [well.name, well.well_number]
            .filter((identifier): identifier is string => Boolean(identifier))
            .some((identifier) => normalizedText.includes(identifier.toLowerCase())),
        );
        if (matchedWell) {
          doc.well_id = matchedWell.id;
          await db.update(documents).set({ well_id: matchedWell.id }).where(eq(documents.id, documentId));
          console.log(`Document ${documentId}: matched well "${matchedWell.name}" for map plotting.`);
        } else {
          console.log(`Document ${documentId}: no known well matched; keeping document searchable without map location.`);
        }
      }
      await db.update(documents).set({ processing_checkpoint: 'chunking' }).where(eq(documents.id, documentId));

      // 3. Chunk text
      const baseMetadata: ChunkMetadata = {
        documentId: doc.id,
        wellId: doc.well_id ?? undefined,
        documentType: doc.document_type
      };
      
      const chunks = chunkingService.chunkDocument(rawText, baseMetadata);
      await db.update(documents).set({ processing_checkpoint: 'indexing' }).where(eq(documents.id, documentId));

      // 4. Process each chunk (NLP + Embed + Index)
      let successfulChunks = 0;
      let firstChunkError: string | null = null;
      
      for (const chunk of chunks) {
        try {
          // Extract NLP entities to enrich payload
          const entities = nlpService.extractDrillingEntities(chunk.text);
          
          let formation = entities.find(e => e.type === 'formation')?.value;
          let eventType = entities.find(e => e.type === 'event_type')?.value;
          let severity = entities.find(e => e.type === 'severity')?.value;
          
          // Parse depth if found
          let depthFt: number | undefined;
          const depthEntity = entities.find(e => e.type === 'depth');
          if (depthEntity) {
             const numMatch = depthEntity.value.match(/[\d,.]+/);
             if (numMatch) depthFt = parseFloat(numMatch[0].replace(/,/g, ''));
             if (depthEntity.value.toLowerCase().includes('m') && !depthEntity.value.toLowerCase().includes('ft')) {
                 depthFt = depthFt ? depthFt * 3.28084 : undefined;
             }
          }

          let eventId: string | undefined = undefined;
          if (eventType && doc.well_id) {
            eventId = uuidv4();
            await db.insert(operational_events).values({
              id: eventId,
              well_id: doc.well_id,
              event_type: mapEventTypeToEnum(eventType),
              severity: mapSeverityToEnum(severity),
              start_depth_ft: depthFt?.toString() ?? '0',
              description: chunk.text.substring(0, 1000),
              cause: entities.find(e => e.type === 'cause')?.value,
              impact: entities.find(e => e.type === 'impact')?.value,
              mitigation: entities.find(e => e.type === 'mitigation')?.value,
              lessons_learned: entities.find(e => e.type === 'lessons_learned')?.value,
              outcome: entities.find(e => e.type === 'outcome')?.value,
              occurred_at: doc.document_date ?? new Date(),
            }).onDuplicateKeyUpdate({ set: { updated_at: new Date() } });
          }

          // In MySQL, we need a unique ID for the chunk record. 
          const chunkMysqlId = uuidv4();
          
          await upsertVector(chunk.text, {
            mysql_id: chunkMysqlId,
            document_id: doc.id.toString(),
            event_id: eventId,
            well_id: doc.well_id ? doc.well_id.toString() : undefined,
            source_type: 'document',
            chunk_text: chunk.text,
            chunk_index: chunk.chunkIndex,
            formation: formation,
            depth_ft: depthFt,
            event_type: eventType,
            severity: severity
          });

          successfulChunks++;
        } catch (chunkError) {
          console.error(`Error processing chunk for document ${documentId}:`, chunkError);
          firstChunkError ??= chunkError instanceof Error ? chunkError.message : String(chunkError);
          // Continue with next chunk
        }
      }

      // 5. Update final status
      const finalStatus = successfulChunks > 0 ? 'processed' : 'failed';
      await db.update(documents).set({
        status: finalStatus,
        processing_checkpoint: finalStatus === 'processed' ? 'complete' : 'failed',
        processing_error: finalStatus === 'failed' ? firstChunkError : null,
      }).where(eq(documents.id, documentId));
      
      console.log(`Document ${documentId} processed. ${successfulChunks}/${chunks.length} chunks indexed.`);

    } catch (error: any) {
      console.error(`Document processing failed for ${documentId}:`, error);
      await db.update(documents).set({ status: 'failed', processing_checkpoint: 'failed', processing_error: error instanceof Error ? error.message : String(error) }).where(eq(documents.id, documentId));
      throw error;
    }
  }
}

export const documentService = new DocumentService();

/** Resume documents left in an upload/processing state after a process restart. */
export async function resumePendingDocuments(): Promise<void> {
  const pending = await db.select({ id: documents.id })
    .from(documents)
    .where(or(eq(documents.status, 'uploaded'), eq(documents.status, 'processing')))
    .limit(20);
  for (const document of pending) {
    void documentService.processDocument(document.id).catch(() => undefined);
  }
}
