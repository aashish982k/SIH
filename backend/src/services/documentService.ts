import path from 'path';
import { eq, or } from 'drizzle-orm';
import { db } from '../db';
import { ocrService } from './ocrService';
import { nlpService } from './nlpService';
import { v4 as uuidv4 } from 'uuid';
import { chunkingService, ChunkMetadata } from './chunkingService';
import { upsertVector } from './qdrantService';
import { mapEventTypeToEnum, mapSeverityToEnum } from '../utils/drillingTerms';
import { operational_events, wells, documents } from '../db/schema';
import { env } from '../config/env';

const LOCATION_NOT_FOUND = 'Could not extract well location from document';

export interface ManualWellInput {
  name: string;
  well_number: string;
  latitude: number;
  longitude: number;
}

interface GeocodingResult {
  lat?: string;
  lon?: string;
}

async function geocodeLocation(query: string): Promise<{ latitude: number; longitude: number } | null> {
  const url = new URL(env.NOMINATIM_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');

  const response = await fetch(url, {
    headers: { 'User-Agent': 'NWIS-drilling-intelligence/1.0 (well-location-resolution)' },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return null;

  const results = await response.json() as GeocodingResult[];
  const latitude = Number(results[0]?.lat);
  const longitude = Number(results[0]?.lon);
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
    ? { latitude, longitude }
    : null;
}

export class DocumentService {
  public async createWellFromManualInput(
    documentId: string,
    input: ManualWellInput,
    submittedByUserId: string,
    allowAdmin = false,
  ) {
    const name = input.name?.trim();
    const wellNumber = input.well_number?.trim();
    if (!name || !wellNumber) throw Object.assign(new Error('name and well_number are required'), { statusCode: 400 });
    if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) {
      throw Object.assign(new Error('latitude must be a number between -90 and 90'), { statusCode: 400 });
    }
    if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
      throw Object.assign(new Error('longitude must be a number between -180 and 180'), { statusCode: 400 });
    }

    return db.transaction(async (tx) => {
      const [doc] = await tx.select().from(documents).where(eq(documents.id, documentId)).limit(1);
      if (!doc) throw Object.assign(new Error('Document not found'), { statusCode: 404 });
      if (doc.well_id) throw Object.assign(new Error('Document is already linked to a well'), { statusCode: 409 });
      if (doc.uploaded_by !== submittedByUserId && !allowAdmin) {
        throw Object.assign(new Error('You are not allowed to resolve this document'), { statusCode: 403 });
      }
      const wellId = uuidv4();
      await tx.insert(wells).values({
        id: wellId,
        name,
        well_number: wellNumber,
        field_name: 'Unspecified',
        operator: 'Oil India Limited',
        latitude: String(input.latitude),
        longitude: String(input.longitude),
        location_precision: 'exact',
        created_by: submittedByUserId,
      });
      await tx.update(documents).set({
        well_id: wellId,
        well_resolution: 'manual',
        resolved_well_name: name,
        resolved_latitude: String(input.latitude),
        resolved_longitude: String(input.longitude),
        processing_error: null,
      }).where(eq(documents.id, documentId));
      return this.backfillDocumentEvents(tx, doc, wellId);
    });
  }

  private async backfillDocumentEvents(tx: any, doc: any, wellId: string) {
    try {
      const filePath = path.isAbsolute(doc.file_path) ? doc.file_path : path.resolve(process.cwd(), doc.file_path);
      const extraction = await ocrService.extractTextWithMethod(filePath);
      const chunks = chunkingService.chunkDocument(extraction.text, {
        documentId: doc.id,
        wellId,
        documentType: doc.document_type,
      });
      for (const chunk of chunks) {
        const entities = nlpService.extractDrillingEntities(chunk.text);
        const eventType = entities.find((e) => e.type === 'event_type')?.value;
        if (!eventType) continue;
        const depthEntity = entities.find((e) => e.type === 'depth');
        const numMatch = depthEntity?.value.match(/[\d,.]+/);
        const depthFt = numMatch ? parseFloat(numMatch[0].replace(/,/g, '')) : 0;
        await tx.insert(operational_events).values({
          id: uuidv4(),
          well_id: wellId,
          event_type: mapEventTypeToEnum(eventType),
          severity: mapSeverityToEnum(entities.find((e) => e.type === 'severity')?.value),
          start_depth_ft: String(depthFt),
          description: chunk.text.substring(0, 1000),
          cause: entities.find((e) => e.type === 'cause')?.value,
          impact: entities.find((e) => e.type === 'impact')?.value,
          mitigation: entities.find((e) => e.type === 'mitigation')?.value,
          lessons_learned: entities.find((e) => e.type === 'lessons_learned')?.value,
          outcome: entities.find((e) => e.type === 'outcome')?.value,
          occurred_at: doc.document_date ?? new Date(),
        }).onDuplicateKeyUpdate({ set: { updated_at: new Date() } });
      }
    } catch (error) {
      console.warn(`Document ${doc.id}: unable to backfill operational events after manual resolution:`, error);
    }
    return { wellId };
  }

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
        const identity = nlpService.extractWellIdentity(rawText);
        const directCoordinates = identity.latitude != null && identity.longitude != null;
        let coordinates = directCoordinates
          ? { latitude: identity.latitude!, longitude: identity.longitude! }
          : null;
        if (!coordinates && identity.locationText) {
          try {
            coordinates = await geocodeLocation(identity.locationText);
          } catch (geocodeError) {
            console.warn(`Document ${documentId}: location geocoding failed:`, geocodeError);
          }
        }

        if (coordinates) {
          const wellId = uuidv4();
          const wellName = identity.wellName || `Well from ${doc.file_name}`;
          await db.insert(wells).values({
            id: wellId,
            name: wellName,
            field_name: identity.fieldName || identity.locationText || 'Unspecified',
            block: identity.block,
            latitude: String(coordinates.latitude),
            longitude: String(coordinates.longitude),
            location_precision: directCoordinates ? 'exact' : 'approximate',
            created_by: doc.uploaded_by,
          });
          doc.well_id = wellId;
          await db.update(documents).set({
            well_id: wellId,
            well_resolution: 'created',
            resolved_well_name: wellName,
            resolved_latitude: String(coordinates.latitude),
            resolved_longitude: String(coordinates.longitude),
          }).where(eq(documents.id, documentId));
          console.log(`Document ${documentId}: created ${directCoordinates ? 'exact' : 'approximate'} well "${wellName}" at (${coordinates.latitude}, ${coordinates.longitude}).`);
        } else {
          await db.update(documents).set({
            well_resolution: 'unresolved',
            processing_error: LOCATION_NOT_FOUND,
          }).where(eq(documents.id, documentId));
          console.log(`Document ${documentId}: could not extract well location; continuing knowledge indexing.`);
        }
      } else {
        await db.update(documents).set({ well_resolution: 'provided' }).where(eq(documents.id, documentId));
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
        processing_error: finalStatus === 'failed'
          ? firstChunkError
          : doc.well_id ? null : LOCATION_NOT_FOUND,
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
