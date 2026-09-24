import { v4 as uuidv4 } from 'uuid';
import { inArray, eq, getTableColumns } from 'drizzle-orm';
import { qdrantClient } from '../config/qdrant';
import { db } from '../db';
import { knowledge_chunks, wells, documents } from '../db/schema';
import { env } from '../config/env';
import { embeddingService } from './embeddingService';

export type KnowledgeChunk = typeof knowledge_chunks.$inferSelect;

export interface KnowledgePayload {
  mysql_id: string;
  well_id?: string;
  document_id?: string;
  event_id?: string;
  source_type: KnowledgeChunk['source_type'];
  chunk_text: string;
  chunk_index?: number;
  formation?: string;
  depth_ft?: number;
  event_type?: string;
  severity?: string;
}

/**
 * Upsert a text chunk into Qdrant + record in knowledge_chunks table.
 * Returns the Qdrant vector ID.
 */
export async function upsertVector(
  chunkText: string,
  payload: KnowledgePayload
): Promise<string> {
  const vectorId = uuidv4();

  // Persist the chunk before the external vector write so MySQL remains the
  // durable source of truth if Qdrant is unavailable.
  await db.insert(knowledge_chunks).values({
    id:               payload.mysql_id,
    document_id:      payload.document_id ?? null,
    event_id:         payload.event_id ?? null,
    well_id:          payload.well_id ?? null,
    qdrant_vector_id: vectorId,
    source_type:      payload.source_type,
    chunk_text:       chunkText,
    chunk_index:      payload.chunk_index ?? null,
    formation_name:   payload.formation ?? null,
    depth_ft:         payload.depth_ft != null ? String(payload.depth_ft) : null,
    event_type:       payload.event_type ?? null,
    severity:         payload.severity ?? null,
    is_embedded:      false,
  });

  const vector = await embeddingService.generateEmbedding(chunkText);

  await qdrantClient.upsert(env.QDRANT_COLLECTION_NAME, {
    wait: true,
    points: [
      {
        id: vectorId,
        vector,
        payload: {
          mysql_id: payload.mysql_id,
          well_id: payload.well_id,
          document_id: payload.document_id,
          event_id: payload.event_id,
          source_type: payload.source_type,
          chunk_index: payload.chunk_index,
          formation: payload.formation,
          depth_ft: payload.depth_ft,
          event_type: payload.event_type,
          severity: payload.severity,
        },
      },
    ],
  });

  await db.update(knowledge_chunks)
    .set({ is_embedded: true })
    .where(eq(knowledge_chunks.id, payload.mysql_id));

  return vectorId;
}

function buildQdrantFilter(filters?: Partial<{
  well_id: string;
  allowed_well_ids?: string[];
  event_type: string;
  formation: string;
  severity: string;
}>) {
  if (!filters) return undefined;
  
  const must: any[] = [];
  
  if (filters.allowed_well_ids?.length) {
    // Nearby-well radius filter resolved upstream (§6.2).
    must.push({ key: 'well_id', match: { any: filters.allowed_well_ids } });
  } else if (filters.well_id) {
    must.push({ key: 'well_id', match: { value: filters.well_id } });
  }
  if (filters.event_type) {
    must.push({ key: 'event_type', match: { text: filters.event_type } }); // text match for flexibility
  }
  if (filters.formation) {
    must.push({ key: 'formation', match: { text: filters.formation } });
  }
  if (filters.severity) {
    must.push({ key: 'severity', match: { value: filters.severity } });
  }

  return must.length > 0 ? { must } : undefined;
}

export interface VectorSearchFilters {
  well_id?: string;
  event_type?: string;
  formation?: string;
  severity?: string;
}

export interface ScoredChunk {
  chunk: any;
  vectorScore: number;
}

/**
 * Raw vector leg of retrieval: embed the query and fetch the top-N similar
 * chunks from Qdrant, hydrated from MySQL. Used by the hybrid search service.
 */
export async function vectorSearch(
  queryText: string,
  limit: number,
  filters?: VectorSearchFilters
): Promise<ScoredChunk[]> {
  const queryVector = await embeddingService.generateEmbedding(queryText);
  const qdrantFilters = buildQdrantFilter(filters);

  const results = await qdrantClient.query(env.QDRANT_COLLECTION_NAME, {
    query: queryVector,
    limit,
    filter: qdrantFilters,
    with_payload: true,
  });

  const points = results.points as any[];
  if (!points.length) return [];

  return await hydrateScoredChunks(points);
}

/**
 * Fetch chunk rows from MySQL for Qdrant points and attach vector scores.
 * Shared by the vector-only and hybrid search paths.
 */
export async function hydrateScoredChunks(
  points: Array<{ payload?: { mysql_id?: string }; score?: number }>
): Promise<ScoredChunk[]> {
  const mysqlIds = points.map((r) => r.payload?.mysql_id).filter(Boolean) as string[];
  if (!mysqlIds.length) return [];

  const chunks = await db.select({
    ...getTableColumns(knowledge_chunks),
    well_name: wells.name,
    file_name: documents.file_name,
  })
    .from(knowledge_chunks)
    .leftJoin(wells, eq(knowledge_chunks.well_id, wells.id))
    .leftJoin(documents, eq(knowledge_chunks.document_id, documents.id))
    .where(inArray(knowledge_chunks.id, mysqlIds));

  const byId = new Map<string, any>(chunks.map((c) => [c.id as string, c]));
  const scored: ScoredChunk[] = [];
  for (const point of points) {
    const mysqlId = point.payload?.mysql_id;
    if (!mysqlId) continue;
    const chunk = byId.get(mysqlId);
    if (chunk) scored.push({ chunk, vectorScore: point.score ?? 0 });
  }
  return scored;
}

/**
 * Semantic search over the knowledge repository (vector-only path).
 * Uses embeddingService and Qdrant similarity search.
 */
export async function searchSimilar(
  queryText: string,
  limit = 10,
  filters?: VectorSearchFilters
): Promise<any[]> {
  const scored = await vectorSearch(queryText, limit, filters);
  return scored.map((s) => ({ ...s.chunk, score: s.vectorScore }));
}

/**
 * Delete a vector from Qdrant by its Qdrant vector ID.
 */
export async function deleteVector(qdrantVectorId: string): Promise<void> {
  await qdrantClient.delete(env.QDRANT_COLLECTION_NAME, {
    wait: true,
    points: [qdrantVectorId],
  });
}
