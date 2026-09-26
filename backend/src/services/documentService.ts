import path from 'path';
import { query } from '../config/db';
import { env } from '../config/env';
import { ocrService } from './ocrService';
import { nlpService } from './nlpService';
import { v4 as uuidv4 } from 'uuid';
import { chunkingService, ChunkMetadata } from './chunkingService';
import { upsertVector } from './qdrantService';

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
      const docs = await query('SELECT * FROM documents WHERE id = ?', [documentId]);
      if (!docs || (docs as any[]).length === 0) {
        throw new Error(`Document ${documentId} not found`);
      }
      const doc = (docs as any[])[0];
      
      const filePath = path.isAbsolute(doc.file_path)
        ? doc.file_path
        : path.resolve(process.cwd(), doc.file_path);

      // Update status to processing
      await query('UPDATE documents SET status = ? WHERE id = ?', ['processing', documentId]);

      // 2. Extract text
      const rawText = await ocrService.extractText(filePath);

      // 3. Chunk text
      const baseMetadata: ChunkMetadata = {
        documentId: doc.id,
        wellId: doc.well_id,
        documentType: doc.document_type
      };
      
      const chunks = chunkingService.chunkDocument(rawText, baseMetadata);

      // 4. Process each chunk (NLP + Embed + Index)
      let successfulChunks = 0;
      
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
             // Very rough conversion to ft if it was in meters (if text had 'm' or 'meters')
             if (depthEntity.value.toLowerCase().includes('m') && !depthEntity.value.toLowerCase().includes('ft')) {
                 depthFt = depthFt ? depthFt * 3.28084 : undefined;
             }
          }

          // In MySQL, we need a unique ID for the chunk record. 
          // We can generate one here, or rely on auto-increment.
          // Since qdrantService takes a `mysql_id`, we'll generate a UUID for the chunk ID.
          const chunkMysqlId = uuidv4();
          
          await upsertVector(chunk.text, {
            mysql_id: chunkMysqlId,
            document_id: doc.id.toString(),
            well_id: doc.well_id ? doc.well_id.toString() : undefined,
            source_type: 'document',
            chunk_text: chunk.text,
            formation: formation,
            depth_ft: depthFt,
            event_type: eventType,
            severity: severity
          });

          successfulChunks++;
        } catch (chunkError) {
          console.error(`Error processing chunk for document ${documentId}:`, chunkError);
          // Continue with next chunk
        }
      }

      // 5. Update final status
      const finalStatus = successfulChunks > 0 ? 'processed' : 'failed';
      await query('UPDATE documents SET status = ? WHERE id = ?', [finalStatus, documentId]);
      
      console.log(`Document ${documentId} processed. ${successfulChunks}/${chunks.length} chunks indexed.`);

    } catch (error: any) {
      console.error(`Document processing failed for ${documentId}:`, error);
      await query('UPDATE documents SET status = ? WHERE id = ?', ['failed', documentId]);
      throw error;
    }
  }
}

export const documentService = new DocumentService();
