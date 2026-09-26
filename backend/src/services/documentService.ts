/**
 * Report → knowledge pipeline.
 *   upload → per-page text (PDF text layer, or OCR for images) → chunks indexed for search
 *   → event extraction (Groq JSON, or offline rules) → validation/normalisation
 *   → engineer review queue → confirmed events feed the hazard profile.
 */
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../config/db';
import { env } from '../config/env';
import { classifyEvent, classifyMitigation, EVENT_TYPES, type EventType } from '../domain/taxonomy';
import { matchFormation } from '../domain/stratigraphy';
import { FT_PER_M } from '../domain/geo';
import { groqEnabled, groqJson } from './groqService';
import { indexChunks, indexEvents } from './knowledgeService';
import { getSurveys } from './wellService';
import { invalidateHazardCache } from './offsetService';

// ── Upload ───────────────────────────────────────────────────
export async function createDocument(file: Express.Multer.File, userId: string, body: { well_id?: string; document_type?: string; title?: string }) {
  const id = uuidv4();
  await query(
    `INSERT INTO documents (id, well_id, uploaded_by, document_type, title, file_name, file_path, file_size_bytes, status)
     VALUES (?,?,?,?,?,?,?,?, 'uploaded')`,
    [id, body.well_id || null, userId, body.document_type || 'other', body.title || file.originalname.replace(/\.[^.]+$/, ''), file.originalname, path.basename(file.path), file.size]
  );
  enqueue(id);
  return getDocument(id);
}

// Single-worker in-process queue keeps the demo laptop responsive
const queue: string[] = [];
let busy = false;
function enqueue(id: string) { queue.push(id); void drain(); }
async function drain() {
  if (busy) return;
  busy = true;
  while (queue.length) {
    const id = queue.shift()!;
    try { await processDocument(id); } catch (err: any) {
      console.error(`[documents] ${id} failed:`, err);
      await query(`UPDATE documents SET status = 'failed', error_message = ? WHERE id = ?`, [String(err?.message ?? err).slice(0, 1000), id]);
    }
  }
  busy = false;
}

async function readPages(filePath: string): Promise<Array<{ page: number; text: string }>> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: await fs.promises.readFile(filePath) });
    try {
      const res = await parser.getText();
      return res.pages.map((p: any) => ({ page: p.num, text: p.text }));
    } finally { await parser.destroy(); }
  }
  if (['.png', '.jpg', '.jpeg'].includes(ext)) {
    const Tesseract = (await import('tesseract.js')).default;
    const { data } = await Tesseract.recognize(filePath, 'eng');
    return [{ page: 1, text: data.text }];
  }
  return [{ page: 1, text: await fs.promises.readFile(filePath, 'utf-8') }];
}

async function processDocument(id: string) {
  const doc = await queryOne(`SELECT * FROM documents WHERE id = ?`, [id]);
  if (!doc) return;
  await query(`UPDATE documents SET status = 'processing', error_message = NULL WHERE id = ?`, [id]);
  const pages = (await readPages(path.resolve(env.UPLOADS_DIR, doc.file_path))).filter((p) => p.text.trim());
  if (!pages.length) throw new Error('No readable text found. If this is a scanned PDF, upload the pages as PNG/JPG images so OCR can read them.');
  await query(`UPDATE documents SET page_count = ? WHERE id = ?`, [pages.length, id]);

  // Resolve the well: chosen at upload, or named in the report
  let wellId: string | null = doc.well_id;
  if (!wellId) {
    const wells = await query<{ id: string; name: string }>(`SELECT id, name FROM wells`);
    const all = pages.map((p) => p.text).join('\n');
    const found = wells.find((w) => new RegExp(`\\b${w.name.replace('-', '[- ]?')}\\b`, 'i').test(all));
    if (found) { wellId = found.id; await query(`UPDATE documents SET well_id = ? WHERE id = ?`, [wellId, id]); }
  }

  // Searchable chunks (one or two per page)
  const chunks = pages.flatMap((p) => splitText(p.text, 1400).map((t) => ({ page: p.page, text: t })));
  await indexChunks(chunks.map((c) => ({
    document_id: id, well_id: wellId, source_type: 'document' as const, text: c.text, page: c.page,
    formation: matchFormation(c.text), event_type: classifyEvent(c.text),
  })));

  // Extraction
  let items: ExtractedEvent[] = [];
  let method = 'rules';
  if (groqEnabled()) {
    try { items = await extractWithGroq(pages); method = `groq:${env.GROQ_MODEL}`; }
    catch (err: any) { console.warn('[documents] Groq extraction failed, using rules:', err?.message); items = extractWithRules(pages); }
  } else {
    items = extractWithRules(pages);
  }

  for (const it of items) {
    const norm = normalise(it);
    if (!norm) continue;
    await query(
      `INSERT INTO extraction_items (id, document_id, item_type, payload, confidence, source_page, source_quote) VALUES (?,?, 'event', ?,?,?,?)`,
      [uuidv4(), id, JSON.stringify(norm.payload), norm.confidence.toFixed(3), it.page ?? null, (it.quote ?? '').slice(0, 1000)]
    );
  }
  const pending = await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM extraction_items WHERE document_id = ? AND status = 'pending'`, [id]);
  await query(`UPDATE documents SET status = ?, extraction_method = ? WHERE id = ?`, [Number(pending?.n) ? 'review' : 'processed', method, id]);
}

function splitText(text: string, max: number): string[] {
  const clean = text.replace(/[ \t]+/g, ' ').trim();
  if (clean.length <= max) return [clean];
  const paras = clean.split(/\n\s*\n|\n(?=[A-Z0-9])/);
  const out: string[] = []; let cur = '';
  for (const p of paras) {
    if ((cur + '\n' + p).length > max && cur) { out.push(cur.trim()); cur = p; } else cur += (cur ? '\n' : '') + p;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.flatMap((c) => (c.length > max * 1.5 ? c.match(new RegExp(`[\\s\\S]{1,${max}}`, 'g')) ?? [c] : [c]));
}

// ── Extraction ───────────────────────────────────────────────
interface ExtractedEvent {
  event_type?: string; depth?: number | string | null; depth_unit?: string | null; formation?: string | null;
  description?: string; cause?: string | null; mitigation?: string | null; outcome?: string | null;
  npt_hours?: number | null; page?: number | null; quote?: string | null; confidence?: number;
}

const SYSTEM_PROMPT = `You extract drilling problems from Oil India Limited well reports (WCR, DDR, mud logs).
Return JSON: {"events":[{"event_type": one of ${EVENT_TYPES.filter((t) => t !== 'other').join('|')},
"depth": number, "depth_unit": "m"|"ft", "formation": string|null, "description": string (one sentence, what happened),
"cause": string|null, "mitigation": string|null (what the crew did), "outcome": string|null (did it work),
"npt_hours": number|null, "page": number, "quote": string (exact sentence from the page, max 300 chars), "confidence": 0..1}]}
Rules: only real problems that happened (not plans or generic procedures). One entry per distinct problem.
Use the depth where it happened. Copy numbers exactly. If nothing qualifies return {"events":[]}.`;

async function extractWithGroq(pages: Array<{ page: number; text: string }>): Promise<ExtractedEvent[]> {
  const batches: string[] = []; let cur = '';
  for (const p of pages) {
    const block = `\n\n=== PAGE ${p.page} ===\n${p.text.slice(0, 6000)}`;
    if ((cur + block).length > 12000 && cur) { batches.push(cur); cur = block; } else cur += block;
  }
  if (cur) batches.push(cur);
  const out: ExtractedEvent[] = [];
  for (const b of batches.slice(0, 12)) {
    const res = await groqJson<{ events: ExtractedEvent[] }>(SYSTEM_PROMPT, b);
    out.push(...(res.events ?? []));
  }
  return out;
}

const DEPTH_RE = /(\d{1,2}[,.]?\d{3}(?:\.\d+)?|\d{3,4}(?:\.\d+)?)\s*(m|mtrs?|metres?|meters?|ft|feet|')(?![a-z])/i;

export function extractWithRules(pages: Array<{ page: number; text: string }>): ExtractedEvent[] {
  const out: ExtractedEvent[] = [];
  for (const p of pages) {
    // Drop heading-only lines ("2. Drilling complications") so they do not glue onto sentences
    const body = p.text.split(/\n/).filter((l) => /[.;:]\s*$|[.;]\s/.test(l) || l.trim().split(/\s+/).length > 6).join(' ');
    const sentences = body.replace(/\s+/g, ' ').split(/(?<=[.;])\s+(?=[A-Z0-9])/);
    for (let i = 0; i < sentences.length; i++) {
      const s = sentences[i];
      const type = classifyEvent(s);
      if (!type) continue;
      const ctx = [s, sentences[i + 1] ?? '', sentences[i + 2] ?? ''].join(' ');
      const dm = s.match(DEPTH_RE) ?? ctx.match(DEPTH_RE);
      if (!dm) continue;
      const mitigation = [sentences[i + 1], sentences[i + 2]].find((x) => x && classifyMitigation(x)) ?? null;
      const outcome = [sentences[i + 1], sentences[i + 2], sentences[i + 3]].find((x) => x && /(resum|restor|cured|freed|recovered|unsuccessful|not successful|sidetrack|controlled)/i.test(x)) ?? null;
      const npt = ctx.match(/(\d+(?:\.\d+)?)\s*(?:hrs?|hours)\s*(?:of\s*)?(?:npt|non[- ]productive)/i) ?? ctx.match(/npt[^0-9]{0,15}(\d+(?:\.\d+)?)/i);
      out.push({
        event_type: type, depth: dm[1], depth_unit: dm[2], formation: matchFormation(ctx),
        description: s.trim().slice(0, 400), mitigation, outcome, npt_hours: npt ? Number(npt[1]) : null,
        page: p.page, quote: s.trim().slice(0, 300), confidence: 0.55,
      });
    }
  }
  // Collapse duplicates of the same problem at the same depth
  const seen = new Set<string>();
  return out.filter((e) => { const k = `${e.event_type}|${e.depth}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

function normalise(it: ExtractedEvent) {
  const type = (EVENT_TYPES as readonly string[]).includes(String(it.event_type)) ? (it.event_type as EventType) : classifyEvent(`${it.event_type} ${it.description}`);
  if (!type) return null;
  const raw = typeof it.depth === 'string' ? Number(it.depth.replace(/,/g, '')) : Number(it.depth);
  if (!raw || !isFinite(raw)) return null;
  const unit = String(it.depth_unit ?? 'm').toLowerCase();
  const depthFt = /^(ft|feet|')/.test(unit) ? raw : raw * FT_PER_M;
  if (depthFt < 50 || depthFt > 25000) return null;
  const formation = matchFormation(it.formation ?? '') ?? matchFormation(it.description ?? '') ?? matchFormation(it.quote ?? '');
  let confidence = Math.max(0.2, Math.min(0.98, Number(it.confidence ?? 0.6)));
  if (!formation) confidence -= 0.15;
  if (!it.mitigation) confidence -= 0.05;
  return {
    confidence: Math.max(0.1, confidence),
    payload: {
      event_type: type, depth_md_ft: Math.round(depthFt * 10) / 10, depth_tvd_ft: null,
      depth_as_reported: `${raw} ${unit}`, formation_name: formation,
      description: (it.description ?? it.quote ?? '').slice(0, 600), cause: it.cause ?? null, mitigation: it.mitigation ?? null,
      mitigation_key: classifyMitigation(it.mitigation), outcome: it.outcome ?? null,
      outcome_rating: rateOutcome(it.outcome), npt_hours: it.npt_hours ?? null, severity: severityFor(it.npt_hours ?? null, type),
    },
  };
}

function rateOutcome(o?: string | null) {
  if (!o) return null;
  if (/(unsuccessful|not successful|failed|could not|sidetrack|left (the )?fish|abandon)/i.test(o)) return 'failed';
  if (/(partial|improved|continued|reduced)/i.test(o)) return 'partial';
  if (/(cured|restored|freed|resum|recovered|controlled|killed|success)/i.test(o)) return 'resolved';
  return null;
}
function severityFor(npt: number | null, type: string) {
  if (npt == null) return ['kick', 'stuck_pipe', 'fishing'].includes(type) ? 'high' : 'medium';
  return npt < 6 ? 'low' : npt < 16 ? 'medium' : npt < 36 ? 'high' : 'critical';
}

// ── Review ───────────────────────────────────────────────────
export async function listDocuments() {
  return query(
    `SELECT d.id, d.title, d.file_name, d.document_type, d.status, d.page_count, d.extraction_method, d.error_message, d.created_at, d.file_size_bytes,
            d.well_id, w.name AS well_name, u.name AS uploaded_by_name,
            SUM(x.status = 'pending') AS pending, SUM(x.status = 'confirmed') AS confirmed, SUM(x.status = 'rejected') AS rejected
     FROM documents d LEFT JOIN wells w ON w.id = d.well_id LEFT JOIN users u ON u.id = d.uploaded_by
     LEFT JOIN extraction_items x ON x.document_id = d.id
     WHERE d.file_path IS NOT NULL
     GROUP BY d.id ORDER BY d.created_at DESC`
  );
}

export async function getDocument(id: string) {
  const d = await queryOne(`SELECT d.*, w.name AS well_name FROM documents d LEFT JOIN wells w ON w.id = d.well_id WHERE d.id = ?`, [id]);
  if (!d) return null;
  const items = await query(`SELECT * FROM extraction_items WHERE document_id = ? ORDER BY source_page, created_at`, [id]);
  return {
    ...d,
    items: items.map((x: any) => ({ ...x, payload: typeof x.payload === 'string' ? JSON.parse(x.payload) : x.payload, confidence: Number(x.confidence) })),
  };
}

export async function reviewItem(itemId: string, userId: string, action: 'confirm' | 'reject', edits?: Record<string, any>) {
  const item = await queryOne(`SELECT x.*, d.well_id, d.id AS doc_id FROM extraction_items x JOIN documents d ON d.id = x.document_id WHERE x.id = ?`, [itemId]);
  if (!item) throw Object.assign(new Error('Item not found'), { statusCode: 404 });
  if (item.status !== 'pending') throw Object.assign(new Error('Item was already reviewed'), { statusCode: 409 });
  if (action === 'reject') {
    await query(`UPDATE extraction_items SET status = 'rejected', reviewed_by = ?, reviewed_at = UTC_TIMESTAMP() WHERE id = ?`, [userId, itemId]);
  } else {
    const wellId = edits?.well_id ?? item.well_id;
    if (!wellId) throw Object.assign(new Error('Choose which well this report belongs to before confirming events.'), { statusCode: 400 });
    const p = { ...(typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload), ...(edits ?? {}) };
    if (!(EVENT_TYPES as readonly string[]).includes(p.event_type)) throw Object.assign(new Error('Unknown event type'), { statusCode: 400 });
    const surveys = (await getSurveys([wellId])).get(wellId) ?? [];
    const md = Number(p.depth_md_ft);
    const tvd = surveys.length ? tvdAt(surveys, md) : md;
    const eventId = uuidv4();
    await query(
      `INSERT INTO operational_events (id, well_id, formation_name, event_type, severity, depth_md_ft, depth_tvd_ft, description, cause, mitigation, mitigation_key,
         outcome, outcome_rating, npt_hours, source_document_id, source_page, verified)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,TRUE)`,
      [eventId, wellId, p.formation_name ?? null, p.event_type, p.severity ?? 'medium', md, tvd, p.description, p.cause ?? null, p.mitigation ?? null,
        p.mitigation_key ?? classifyMitigation(p.mitigation), p.outcome ?? null, p.outcome_rating ?? rateOutcome(p.outcome), p.npt_hours ?? null, item.doc_id, item.source_page]
    );
    await query(`UPDATE extraction_items SET status = 'confirmed', created_event_id = ?, payload = ?, reviewed_by = ?, reviewed_at = UTC_TIMESTAMP() WHERE id = ?`,
      [eventId, JSON.stringify(p), userId, itemId]);
    if (p.npt_hours) await query(`UPDATE wells SET total_npt_hours = total_npt_hours + ? WHERE id = ?`, [p.npt_hours, wellId]);
    await indexEvents([eventId]);
    invalidateHazardCache();
    const { invalidateLiveProfiles } = await import('./live/liveEngine');
    invalidateLiveProfiles();
  }
  const left = await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM extraction_items WHERE document_id = ? AND status = 'pending'`, [item.doc_id]);
  if (!Number(left?.n)) await query(`UPDATE documents SET status = 'processed' WHERE id = ?`, [item.doc_id]);
  return getDocument(item.doc_id);
}

function tvdAt(stations: any[], md: number) {
  for (let i = 1; i < stations.length; i++) {
    if (md <= stations[i].md) {
      const a = stations[i - 1], b = stations[i];
      return a.tvd + (b.tvd - a.tvd) * ((md - a.md) / (b.md - a.md || 1));
    }
  }
  return md;
}

export async function setDocumentWell(id: string, wellId: string) {
  await query(`UPDATE documents SET well_id = ? WHERE id = ?`, [wellId, id]);
  return getDocument(id);
}

