import { v4 as uuidv4 } from 'uuid';
import { qdrantClient } from '../config/qdrant';
import { query } from '../config/db';
import { env } from '../config/env';
import { embeddingService } from './embeddingService';

export interface KnowledgePayload {
  mysql_id: string;
  well_id?: string;
  document_id?: string;
  event_id?: string;
  source_type: 'document' | 'event' | 'lesson' | 'mitigation' | 'formation';
  chunk_text: string;
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
          formation: payload.formation,
          depth_ft: payload.depth_ft,
          event_type: payload.event_type,
          severity: payload.severity,
        },
      },
    ],
  });

  // Record in MySQL
  await query(
    `INSERT INTO knowledge_chunks
       (id, document_id, event_id, well_id, qdrant_vector_id, source_type,
        chunk_text, formation_name, depth_ft, event_type, severity, is_embedded)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      payload.mysql_id,
      payload.document_id ?? null,
      payload.event_id ?? null,
      payload.well_id ?? null,
      vectorId,
      payload.source_type,
      chunkText,
      payload.formation ?? null,
      payload.depth_ft ?? null,
      payload.event_type ?? null,
      payload.severity ?? null,
      true, // is_embedded = true for real embeddings
    ]
  );

  return vectorId;
}

function buildQdrantFilter(filters?: Partial<{ well_id: string; event_type: string; formation: string; severity: string }>) {
  if (!filters) return undefined;
  
  const must: any[] = [];
  
  if (filters.well_id) {
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

/**
 * Semantic search over the knowledge repository.
 * Uses embeddingService and Qdrant similarity search.
 */
export async function searchSimilar(
  queryText: string,
  limit = 10,
  filters?: Partial<{ well_id: string; event_type: string; formation: string; severity: string }>
): Promise<any[]> {
  const queryVector = await embeddingService.generateEmbedding(queryText);
  const qdrantFilters = buildQdrantFilter(filters);
  
  const results = await qdrantClient.query(env.QDRANT_COLLECTION_NAME, {
    query: queryVector,
    limit,
    filter: qdrantFilters,
    with_payload: true,
  });
  
  const mysqlIds = results.points.map((r: any) => r.payload?.mysql_id).filter(Boolean);
  if (!mysqlIds.length) return [];
  
  const chunks = await query(
    `SELECT kc.*, w.name AS well_name FROM knowledge_chunks kc
     LEFT JOIN wells w ON kc.well_id = w.id
     WHERE kc.id IN (${mysqlIds.map(() => '?').join(',')})`,
    mysqlIds
  );
  
  // Return chunks ordered by their original Qdrant result score
  const orderedChunks = results.points.map((r: any) => {
    const chunk = (chunks as any[]).find((c: any) => c.id === r.payload?.mysql_id);
    return chunk ? { ...chunk, score: r.score } : null;
  }).filter(Boolean);

  return orderedChunks;
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
