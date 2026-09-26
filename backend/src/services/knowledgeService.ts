import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db';
import { env } from '../config/env';
import { qdrantClient } from '../config/qdrant';
import { embed, embedOne } from './embeddingService';
import { groqChat, groqEnabled } from './groqService';
import { EVENT_LABELS, type EventType } from '../domain/taxonomy';
import { FT_PER_M } from '../domain/geo';

export interface SearchFilters {
  wellIds?: string[];
  formation?: string;
  eventType?: string;
  depthMin?: number;
  depthMax?: number;
  limit?: number;
}

interface ChunkInput {
  document_id?: string | null; event_id?: string | null; well_id?: string | null;
  source_type: 'document' | 'event'; text: string; page?: number | null;
  formation?: string | null; depth_ft?: number | null; event_type?: string | null;
}

// ── Indexing ─────────────────────────────────────────────────
export function eventToText(e: any): string {
  const depth = Number(e.depth_md_ft);
  return [
    `${e.well_name ?? ''} · ${e.formation_name ?? 'unknown formation'} · ${Math.round(depth / FT_PER_M)} m (${Math.round(depth)} ft) · ${EVENT_LABELS[e.event_type as EventType] ?? e.event_type}.`,
    e.description,
    e.cause ? `Cause: ${e.cause}` : '',
    e.mitigation ? `Mitigation: ${e.mitigation}` : '',
    e.outcome ? `Outcome: ${e.outcome}` : '',
    e.lessons_learned ? `Lesson learned: ${e.lessons_learned}` : '',
  ].filter(Boolean).join(' ');
}

/** Store chunks in MySQL, then embed and upsert them into Qdrant (best effort). */
export async function indexChunks(chunks: ChunkInput[]): Promise<{ stored: number; embedded: number }> {
  if (!chunks.length) return { stored: 0, embedded: 0 };
  const rows = chunks.map((c) => ({ id: uuidv4(), ...c }));
  for (const r of rows) {
    await query(
      `INSERT INTO knowledge_chunks (id, document_id, event_id, well_id, source_type, chunk_text, page, formation_name, depth_ft, event_type)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [r.id, r.document_id ?? null, r.event_id ?? null, r.well_id ?? null, r.source_type, r.text, r.page ?? null, r.formation ?? null, r.depth_ft ?? null, r.event_type ?? null]
    );
  }
  let embedded = 0;
  try {
    for (let i = 0; i < rows.length; i += 64) {
      const batch = rows.slice(i, i + 64);
      const vectors = await embed(batch.map((b) => b.text));
      await qdrantClient.upsert(env.QDRANT_COLLECTION_NAME, {
        wait: true,
        points: batch.map((b, k) => ({
          id: b.id,
          vector: vectors[k],
          payload: {
            well_id: b.well_id ?? null, document_id: b.document_id ?? null, event_id: b.event_id ?? null,
            source_type: b.source_type, formation: b.formation ?? null, event_type: b.event_type ?? null,
            depth_ft: b.depth_ft ?? null, page: b.page ?? null,
          },
        })),
      });
      await query(`UPDATE knowledge_chunks SET is_embedded = TRUE WHERE id IN (${batch.map(() => '?').join(',')})`, batch.map((b) => b.id));
      embedded += batch.length;
    }
  } catch (err: any) {
    console.warn('[knowledge] vector indexing skipped:', err?.message ?? err);
  }
  return { stored: rows.length, embedded };
}

export async function indexEvents(eventIds: string[]): Promise<void> {
  if (!eventIds.length) return;
  const events = await query(
    `SELECT e.*, w.name AS well_name FROM operational_events e JOIN wells w ON w.id = e.well_id
     WHERE e.id IN (${eventIds.map(() => '?').join(',')})`, eventIds);
  await indexChunks(events.map((e: any) => ({
    event_id: e.id, well_id: e.well_id, document_id: e.source_document_id, source_type: 'event' as const,
    text: eventToText(e), page: e.source_page, formation: e.formation_name, depth_ft: Number(e.depth_md_ft), event_type: e.event_type,
  })));
}

// ── Search ───────────────────────────────────────────────────
function sqlFilters(f: SearchFilters): { where: string; params: any[] } {
  const c: string[] = []; const p: any[] = [];
  if (f.wellIds?.length) { c.push(`kc.well_id IN (${f.wellIds.map(() => '?').join(',')})`); p.push(...f.wellIds); }
  if (f.formation) { c.push('kc.formation_name = ?'); p.push(f.formation); }
  if (f.eventType) { c.push('kc.event_type = ?'); p.push(f.eventType); }
  if (f.depthMin != null) { c.push('kc.depth_ft >= ?'); p.push(f.depthMin); }
  if (f.depthMax != null) { c.push('kc.depth_ft <= ?'); p.push(f.depthMax); }
  return { where: c.length ? `AND ${c.join(' AND ')}` : '', params: p };
}

function qdrantFilter(f: SearchFilters) {
  const must: any[] = [];
  if (f.wellIds?.length) must.push({ key: 'well_id', match: { any: f.wellIds } });
  if (f.formation) must.push({ key: 'formation', match: { value: f.formation } });
  if (f.eventType) must.push({ key: 'event_type', match: { value: f.eventType } });
  if (f.depthMin != null || f.depthMax != null) must.push({ key: 'depth_ft', range: { gte: f.depthMin ?? undefined, lte: f.depthMax ?? undefined } });
  return must.length ? { must } : undefined;
}

export interface SearchResult {
  id: string; text: string; score: number; matchedBy: Array<'semantic' | 'keyword'>;
  source_type: string; page: number | null; formation_name: string | null; depth_ft: number | null; event_type: string | null;
  well: { id: string; name: string; field: string } | null;
  document: { id: string; title: string } | null;
  event: { id: string; severity: string; outcome_rating: string | null; npt_hours: number | null; mitigation: string | null } | null;
}

export async function search(q: string, filters: SearchFilters = {}): Promise<{ results: SearchResult[]; mode: string[] }> {
  const limit = Math.min(filters.limit ?? 12, 40);
  const pool = 40;
  const ranks = new Map<string, { score: number; by: Set<'semantic' | 'keyword'> }>();
  const mode: string[] = [];
  const add = (id: string, rank: number, by: 'semantic' | 'keyword') => {
    const cur = ranks.get(id) ?? { score: 0, by: new Set() };
    cur.score += 1 / (60 + rank);
    cur.by.add(by);
    ranks.set(id, cur);
  };

  // Semantic (Qdrant)
  try {
    const vector = await embedOne(q);
    const res = await qdrantClient.query(env.QDRANT_COLLECTION_NAME, { query: vector, limit: pool, filter: qdrantFilter(filters), with_payload: false });
    res.points.forEach((p, i) => add(String(p.id), i, 'semantic'));
    mode.push('semantic');
  } catch (err: any) {
    console.warn('[search] semantic search unavailable:', err?.message ?? err);
  }

  // Keyword (MySQL full-text) — catches exact jargon like "LCM", "13-3/8", "BCS"
  const { where, params } = sqlFilters(filters);
  const kw = await query<{ id: string }>(
    `SELECT kc.id FROM knowledge_chunks kc
     WHERE MATCH(kc.chunk_text) AGAINST (? IN NATURAL LANGUAGE MODE) ${where}
     ORDER BY MATCH(kc.chunk_text) AGAINST (? IN NATURAL LANGUAGE MODE) DESC LIMIT ${pool}`,
    [q, ...params, q]
  );
  kw.forEach((r, i) => add(r.id, i, 'keyword'));
  mode.push('keyword');

  const top = [...ranks.entries()].sort((a, b) => b[1].score - a[1].score).slice(0, limit);
  if (!top.length) return { results: [], mode };

  const rows = await query(
    `SELECT kc.*, w.name AS well_name, w.field_name, d.title AS doc_title,
            e.severity, e.outcome_rating, e.npt_hours, e.mitigation
     FROM knowledge_chunks kc
     LEFT JOIN wells w ON w.id = kc.well_id
     LEFT JOIN documents d ON d.id = kc.document_id
     LEFT JOIN operational_events e ON e.id = kc.event_id
     WHERE kc.id IN (${top.map(() => '?').join(',')})`, top.map(([id]) => id));
  const byId = new Map(rows.map((r: any) => [r.id, r]));
  const maxScore = top[0][1].score;

  return {
    mode,
    results: top.map(([id, s]) => {
      const r: any = byId.get(id);
      if (!r) return null;
      return {
        id, text: r.chunk_text, score: Math.round((s.score / maxScore) * 100) / 100, matchedBy: [...s.by],
        source_type: r.source_type, page: r.page, formation_name: r.formation_name,
        depth_ft: r.depth_ft != null ? Number(r.depth_ft) : null, event_type: r.event_type,
        well: r.well_id ? { id: r.well_id, name: r.well_name, field: r.field_name } : null,
        document: r.document_id ? { id: r.document_id, title: r.doc_title } : null,
        event: r.event_id ? { id: r.event_id, severity: r.severity, outcome_rating: r.outcome_rating, npt_hours: r.npt_hours != null ? Number(r.npt_hours) : null, mitigation: r.mitigation } : null,
      } as SearchResult;
    }).filter(Boolean) as SearchResult[],
  };
}

// ── Cited answers ────────────────────────────────────────────
export async function ask(question: string, filters: SearchFilters = {}) {
  const { results } = await search(question, { ...filters, limit: 8 });
  if (!results.length) {
    return { answer: 'No matching records were found in the offset-well knowledge base for this question and filter set.', sources: [], generated: false };
  }
  if (!groqEnabled()) {
    return { answer: null, sources: results, generated: false, reason: 'Add GROQ_API_KEY to backend/.env to get a written answer. The matching records are listed below.' };
  }
  const context = results.map((r, i) =>
    `[${i + 1}] ${r.well?.name ?? 'Unknown well'} | ${r.document?.title ?? 'record'}${r.page ? `, p.${r.page}` : ''}\n${r.text}`
  ).join('\n\n');
  const answer = await groqChat([
    {
      role: 'system',
      content: 'You are NWIS, a drilling knowledge assistant for Oil India Limited engineers. Answer ONLY from the numbered sources. ' +
        'Cite every claim with its source number in square brackets, e.g. [2]. Give depths in metres with feet in brackets. ' +
        'Prefer concrete numbers (depths, NPT hours, mud weights) and say which mitigations worked or failed. ' +
        'If the sources do not answer the question, say so plainly. Keep it under 180 words, use short paragraphs or bullets.',
    },
    { role: 'user', content: `Question: ${question}\n\nSources:\n${context}` },
  ], { maxTokens: 700, temperature: 0.1 });
  return { answer, sources: results, generated: true };
}
