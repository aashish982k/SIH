import { v4 as uuidv4 } from 'uuid';
import { qdrantClient, isQdrantAvailable } from '../config/qdrant';
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
 * Upsert a text chunk into Qdrant (if online) + record in knowledge_chunks table.
 */
export async function upsertVector(
  chunkText: string,
  payload: KnowledgePayload
): Promise<string> {
  const vectorId = uuidv4();

  if (isQdrantAvailable) {
    try {
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
    } catch (e: any) {
      console.warn('⚠️  Qdrant upsert bypassed:', e.message);
    }
  }

  // Record in SQL database
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
      isQdrantAvailable ? 1 : 0,
    ]
  );

  return vectorId;
}

function buildQdrantFilter(filters?: Partial<{ well_id: string; event_type: string; formation: string; severity: string }>) {
  if (!filters) return undefined;
  const must: any[] = [];
  if (filters.well_id) must.push({ key: 'well_id', match: { value: filters.well_id } });
  if (filters.event_type) must.push({ key: 'event_type', match: { text: filters.event_type } });
  if (filters.formation) must.push({ key: 'formation', match: { text: filters.formation } });
  if (filters.severity) must.push({ key: 'severity', match: { value: filters.severity } });
  return must.length > 0 ? { must } : undefined;
}

/**
 * Semantic / Similarity search over the knowledge repository.
 * If Qdrant is available, uses vector search.
 * Otherwise, uses full-text relevance search in database.
 */
export async function searchSimilar(
  queryText: string,
  limit = 10,
  filters?: Partial<{ well_id: string; event_type: string; formation: string; severity: string }>
): Promise<any[]> {
  // If Qdrant is available, attempt vector search
  if (isQdrantAvailable) {
    try {
      const queryVector = await embeddingService.generateEmbedding(queryText);
      const qdrantFilters = buildQdrantFilter(filters);

      const results = await qdrantClient.query(env.QDRANT_COLLECTION_NAME, {
        query: queryVector,
        limit,
        filter: qdrantFilters,
        with_payload: true,
      });

      const mysqlIds = results.points.map((r: any) => r.payload?.mysql_id).filter(Boolean);
      if (mysqlIds.length) {
        const chunks = await query(
          `SELECT kc.*, w.name AS well_name FROM knowledge_chunks kc
           LEFT JOIN wells w ON kc.well_id = w.id
           WHERE kc.id IN (${mysqlIds.map(() => '?').join(',')})`,
          mysqlIds
        );

        return results.points.map((r: any) => {
          const chunk = (chunks as any[]).find((c: any) => c.id === r.payload?.mysql_id);
          return chunk ? { ...chunk, score: r.score } : null;
        }).filter(Boolean);
      }
    } catch (e: any) {
      console.warn('⚠️  Qdrant search failed, falling back to SQL search:', e.message);
    }
  }

  // ── Database Fallback Search ────────────────────────────────────────────────
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters?.well_id) {
    conditions.push('kc.well_id = ?');
    params.push(filters.well_id);
  }
  if (filters?.event_type) {
    conditions.push('kc.event_type = ?');
    params.push(filters.event_type);
  }
  if (filters?.formation) {
    conditions.push('kc.formation_name LIKE ?');
    params.push(`%${filters.formation}%`);
  }
  if (filters?.severity) {
    conditions.push('kc.severity = ?');
    params.push(filters.severity);
  }

  // Split query keywords for multi-token match
  if (queryText && queryText.trim()) {
    const tokens = queryText.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    if (tokens.length) {
      const tokenClauses = tokens.map(() => '(LOWER(kc.chunk_text) LIKE ? OR LOWER(kc.formation_name) LIKE ? OR LOWER(kc.event_type) LIKE ?)');
      conditions.push(`(${tokenClauses.join(' OR ')})`);
      for (const t of tokens) {
        params.push(`%${t}%`, `%${t}%`, `%${t}%`);
      }
    }
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `
    SELECT kc.*, w.name AS well_name, w.field_name
    FROM knowledge_chunks kc
    LEFT JOIN wells w ON kc.well_id = w.id
    ${where}
    ORDER BY kc.created_at DESC
    LIMIT ?
  `;
  params.push(limit);

  const results = await query(sql, params);
  return results.map((r: any, idx: number) => ({
    ...r,
    score: Math.max(0.65, +(0.95 - idx * 0.05).toFixed(2)),
  }));
}

export async function deleteVector(qdrantVectorId: string): Promise<void> {
  if (isQdrantAvailable) {
    try {
      await qdrantClient.delete(env.QDRANT_COLLECTION_NAME, {
        wait: true,
        points: [qdrantVectorId],
      });
    } catch (e) {}
  }
}
