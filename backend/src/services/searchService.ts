/**
 * Hybrid retrieval pipeline (implementation.md §5):
 *
 *   query ──┬─► vector retrieval (Qdrant, topK_vector)
 *           └─► lexical retrieval (BM25 over indexed chunk text, topK_bm25)
 *
 *   → merge by chunk id → RRF fusion → optional reranker (Python /rerank,
 *     cross-encoder or BM25 fallback) → hydrated, grounded results.
 *
 * The reranker is optional: if ML_SERVICE_URL is unreachable or
 * RERANKER_ENABLED=false, the fused RRF ordering is returned as-is
 * (graceful fallback, implementation.md §5.4/§12).
 */

import { eq, inArray, like, and, gte, lte, desc, sql, getTableColumns } from 'drizzle-orm';
import { db } from '../db';
import { wells, knowledge_chunks, documents } from '../db/schema';
import { env } from '../config/env';
import { bm25Score } from '../utils/bm25';
import { vectorSearch, VectorSearchFilters } from './qdrantService';

export interface HybridSearchFilters extends VectorSearchFilters {
  depth_min?: number;
  depth_max?: number;
  /** Nearby-well filter: restrict to wells within this radius of lat/lng. */
  radius_km?: number;
  latitude?: number;
  longitude?: number;
}

export interface HybridSearchOptions {
  limit: number;                 // final number of results returned
  reranker?: boolean;            // override env.RERANKER_ENABLED for this call
  hyde?: boolean;                // override env.HYDE_ENABLED for this call
}

export interface HybridSearchResult {
  results: any[];
  telemetry: {
    vectorCandidates: number;
    bm25Candidates: number;
    mergedCandidates: number;
    rerankerUsed: boolean;
    rerankerMethod?: string;
    vectorMs: number;
    bm25Ms: number;
    rerankMs: number;
  };
}

interface Candidate {
  chunk: any;
  vectorScore: number;
  bm25Score: number;
  vectorRank?: number;
  bm25Rank?: number;
  rrfScore: number;
}

/** Reciprocal Rank Fusion constant (standard k=60). */
function rrf(rank: number | undefined, k: number): number {
  return rank === undefined ? 0 : 1 / (k + rank);
}

async function callReranker(
  query: string,
  candidates: Candidate[]
): Promise<Map<string, { score: number; method: string }> | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.ML_SERVICE_TIMEOUT_MS);

    const response = await fetch(`${env.ML_SERVICE_URL}/rerank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        candidates: candidates.map((c) => ({
          id: String(c.chunk.id),
          text: c.chunk.chunk_text ?? '',
        })),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!response.ok) return null;

    const data = (await response.json()) as {
      results: Array<{ id: string; score: number }>;
      method: string;
    };
    const byId = new Map(data.results.map((r) => [String(r.id), { score: r.score, method: data.method }]));
    return byId.size > 0 ? byId : null;
  } catch {
    // Service down/timeout — graceful fallback to fused ranking.
    return null;
  }
}

export async function hybridSearch(
  queryText: string,
  filters: HybridSearchFilters | undefined,
  options: HybridSearchOptions
): Promise<HybridSearchResult> {
  const telemetry = {
    vectorCandidates: 0,
    bm25Candidates: 0,
    mergedCandidates: 0,
    rerankerUsed: false,
    rerankerMethod: undefined as string | undefined,
    vectorMs: 0,
    bm25Ms: 0,
    rerankMs: 0,
  };

  // ── Stage 1a: vector candidates ────────────────────────────────────────────
  // Stage 0: nearby-well radius filter (§6.2). When radius_km + lat/lng are
  // provided, resolve the allowed well IDs once and constrain both legs.
  const effectiveFilters = { ...filters } as HybridSearchFilters & { allowed_well_ids?: string[] };
  if (filters?.radius_km !== undefined && filters.latitude !== undefined && filters.longitude !== undefined) {
    const allowedWellIds = await wellIdsWithinRadius(
      filters.latitude, filters.longitude, filters.radius_km
    );
    if (!allowedWellIds.length) {
      return { results: [], telemetry };
    }
    if (effectiveFilters.well_id && !allowedWellIds.includes(effectiveFilters.well_id)) {
      // Explicitly requested well is outside the radius — no results.
      return { results: [], telemetry };
    }
    effectiveFilters.allowed_well_ids = allowedWellIds;
  }

  const hydeEnabled = options.hyde ?? env.HYDE_ENABLED;
  const retrievalQuery = hydeEnabled ? await generateHydeQuery(queryText) : queryText;
  const vectorStart = Date.now();
  // Use the hypothetical document for semantic retrieval, while BM25 always
  // uses the user's exact words for lexical precision.
  const vectorLeg = vectorSearch(retrievalQuery, env.HYBRID_TOPK_VECTOR, effectiveFilters).catch(() => [] as Awaited<ReturnType<typeof vectorSearch>>);
  const bm25Start = Date.now();

  // ── Stage 1b: lexical candidates (BM25 over the vector leg's hydrated
  // corpus is not enough — we need the broader chunk corpus. To keep this
  // implementation dependency-free we run BM25 over a MySQL FTS-free corpus:
  // the union of recent chunk texts matching the structured filters.) ─────────
  const lexicalRows = await loadLexicalCorpus(effectiveFilters);
  telemetry.bm25Ms = Date.now() - bm25Start;

  const vectorResults = await vectorLeg;
  telemetry.vectorMs = Date.now() - vectorStart;
  telemetry.vectorCandidates = vectorResults.length;

  // Score the corpus with BM25 and take topK_bm25.
  const { topBm25, corpusSize } = scoreLexicalCorpus(queryText, lexicalRows, env.HYBRID_TOPK_BM25);
  telemetry.bm25Candidates = topBm25.length;
  void corpusSize;

  // ── Stage 2: merge by chunk id, keep per-leg scores ────────────────────────
  const candidates = new Map<string, Candidate>();

  vectorResults.forEach((r, idx) => {
    const id = String(r.chunk.id);
    candidates.set(id, {
      chunk: r.chunk,
      vectorScore: r.vectorScore,
      bm25Score: 0,
      vectorRank: idx + 1,
      rrfScore: 0,
    });
  });

  topBm25.forEach((r, idx) => {
    const id = String(r.chunk.id);
    const existing = candidates.get(id);
    if (existing) {
      existing.bm25Score = r.bm25Score;
      existing.bm25Rank = idx + 1;
    } else {
      candidates.set(id, {
        chunk: r.chunk,
        vectorScore: 0,
        bm25Score: r.bm25Score,
        bm25Rank: idx + 1,
        rrfScore: 0,
      });
    }
  });

  telemetry.mergedCandidates = candidates.size;

  // ── Stage 3: RRF fusion ────────────────────────────────────────────────────
  for (const candidate of candidates.values()) {
    candidate.rrfScore =
      rrf(candidate.vectorRank, env.HYBRID_RRF_K) + rrf(candidate.bm25Rank, env.HYBRID_RRF_K);
  }

  let ordered = [...candidates.values()].sort((a, b) => b.rrfScore - a.rrfScore);

  // ── Stage 4: optional reranking over the fused top slice ──────────────────
  const rerankerAllowed = options.reranker ?? env.RERANKER_ENABLED;
  if (rerankerAllowed && ordered.length > 1) {
    const rerankSlice = ordered.slice(0, Math.max(options.limit * 3, 12));
    const rerankStart = Date.now();
    const reranked = await callReranker(queryText, rerankSlice);
    telemetry.rerankMs = Date.now() - rerankStart;

    if (reranked) {
      telemetry.rerankerUsed = true;
      telemetry.rerankerMethod = reranked.get(reranked.keys().next().value as string)?.method;
      ordered = rerankSlice
        .map((c) => ({ c, r: reranked.get(String(c.chunk.id))?.score ?? -Infinity }))
        .sort((a, b) => b.r - a.r)
        .map(({ c }) => c)
        .concat(ordered.slice(rerankSlice.length));
    }
  }

  // ── Stage 5: shape the grounded response ───────────────────────────────────
  const results = ordered.slice(0, options.limit).map((c) => ({
    ...c.chunk,
    score: c.vectorScore || c.bm25Score,
    score_detail: {
      vector: c.vectorScore,
      bm25: round6(c.bm25Score),
      vector_rank: c.vectorRank ?? null,
      bm25_rank: c.bm25Rank ?? null,
      rrf: round6(c.rrfScore),
      reranker_method: telemetry.rerankerMethod ?? null,
    },
  }));

  return { results, telemetry };
}

async function generateHydeQuery(query: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.ML_SERVICE_TIMEOUT_MS);
    const response = await fetch(`${env.ML_SERVICE_URL}/hyde`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return query;
    const data = (await response.json()) as { hypothetical_document?: string };
    return data.hypothetical_document?.trim() || query;
  } catch {
    // HyDE must never make search unavailable.
    return query;
  }
}

function round6(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

/**
 * Resolve well IDs within a geographic radius (Haversine in SQL) for the
 * nearby-well search filter (§6.2 radiusKm).
 */
async function wellIdsWithinRadius(lat: number, lng: number, radiusKm: number): Promise<string[]> {
  const distanceSql = sql<number>`(
    6371 * acos(
      cos(radians(${lat})) * cos(radians(${wells.latitude})) *
      cos(radians(${wells.longitude}) - radians(${lng})) +
      sin(radians(${lat})) * sin(radians(${wells.latitude}))
    )
  )`;

  const rows = await db.select({ id: wells.id })
    .from(wells)
    .where(sql`${wells.latitude} IS NOT NULL AND ${wells.longitude} IS NOT NULL`)
    .having(sql`${distanceSql} <= ${radiusKm}`);

  return rows.map((r) => r.id);
}

// ── Lexical corpus loading ─────────────────────────────────────────────────────

interface LexicalRow {
  chunk: any;
  bm25Score: number;
}

/**
 * Load the chunk corpus for BM25 scoring. Structured filters (well, event
 * type, formation, severity, depth range) are applied in SQL so the lexical
 * leg respects the same constraints as the vector leg.
 */
async function loadLexicalCorpus(
  filters: HybridSearchFilters | undefined
): Promise<Array<{ chunk: any }>> {
  const conditions: any[] = [];

  if (filters?.well_id) conditions.push(eq(knowledge_chunks.well_id, filters.well_id));
  if (filters?.event_type) conditions.push(eq(knowledge_chunks.event_type, filters.event_type));
  if (filters?.formation) conditions.push(like(knowledge_chunks.formation_name, `%${filters.formation}%`));
  if (filters?.severity) conditions.push(eq(knowledge_chunks.severity, filters.severity));
  if (filters?.depth_min !== undefined) conditions.push(gte(knowledge_chunks.depth_ft, String(filters.depth_min)));
  if (filters?.depth_max !== undefined) conditions.push(lte(knowledge_chunks.depth_ft, String(filters.depth_max)));
  
  const allowedWellIds = (filters as any)?.allowed_well_ids as string[] | undefined;
  if (allowedWellIds?.length) {
    conditions.push(inArray(knowledge_chunks.well_id, allowedWellIds));
  } else if (allowedWellIds && !allowedWellIds.length) {
    conditions.push(sql`1 = 0`);
  }

  const where = conditions.length ? and(...conditions) : undefined;

  // Bound the corpus — BM25 candidate generation does not need the full table
  const rows = await db.select({
    ...getTableColumns(knowledge_chunks),
    well_name: wells.name,
    file_name: documents.file_name,
  })
    .from(knowledge_chunks)
    .leftJoin(wells, eq(knowledge_chunks.well_id, wells.id))
    .leftJoin(documents, eq(knowledge_chunks.document_id, documents.id))
    .where(where)
    .orderBy(desc(knowledge_chunks.created_at))
    .limit(2000);

  return rows.map((chunk) => ({ chunk }));
}

function scoreLexicalCorpus(
  queryText: string,
  corpus: Array<{ chunk: any }>,
  topK: number
): { topBm25: LexicalRow[]; corpusSize: number } {
  const docs = corpus.map(({ chunk }) => ({ id: String(chunk.id), text: chunk.chunk_text ?? '' }));
  const scores = bm25Score(queryText, docs);

  const scored: LexicalRow[] = corpus
    .map(({ chunk }) => ({ chunk, bm25Score: scores.get(String(chunk.id)) ?? 0 }))
    .filter((r) => r.bm25Score > 0)
    .sort((a, b) => b.bm25Score - a.bm25Score)
    .slice(0, topK);

  return { topBm25: scored, corpusSize: corpus.length };
}
