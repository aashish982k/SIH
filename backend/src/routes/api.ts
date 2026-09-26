import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';
import { sendSuccess, sendError } from '../utils/response';
import { query } from '../config/db';
import { env } from '../config/env';
import { FORMATIONS } from '../domain/stratigraphy';
import { EVENT_LABELS, MITIGATIONS, RISK_TYPES } from '../domain/taxonomy';
import * as wells from '../services/wellService';
import * as offsets from '../services/offsetService';
import * as knowledge from '../services/knowledgeService';
import * as documents from '../services/documentService';
import * as alerts from '../services/alertService';
import * as analytics from '../services/analyticsService';
import * as live from '../services/live/liveEngine';
import { groqEnabled } from '../services/groqService';
import { embeddingStatus } from '../services/embeddingService';

const router = Router();
router.use(authenticate);

type Handler = (req: AuthRequest, res: Response) => Promise<void>;
const ah = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => fn(req as AuthRequest, res).catch(next);
const radiusOf = (req: Request) => Math.max(1, Math.min(40, Number(req.query.radius ?? env.DEFAULT_RADIUS_KM)));

// ── Meta ─────────────────────────────────────────────────────
router.get('/meta', ah(async (_req, res) => {
  sendSuccess(res, {
    formations: FORMATIONS.map(({ aliases, ...f }) => f),
    eventTypes: Object.entries(EVENT_LABELS).map(([key, label]) => ({ key, label })),
    riskTypes: RISK_TYPES,
    mitigations: Object.fromEntries(Object.entries(MITIGATIONS).map(([k, v]) => [k, v.label])),
    liveWells: live.liveWells(),
    capabilities: { groq: groqEnabled(), groqModel: groqEnabled() ? env.GROQ_MODEL : null, embeddings: embeddingStatus() },
    defaultRadiusKm: env.DEFAULT_RADIUS_KM,
  });
}));

// ── Wells ────────────────────────────────────────────────────
router.get('/wells', ah(async (req, res) => {
  sendSuccess(res, await wells.listWells({ status: req.query.status as string, field: req.query.field as string }));
}));

router.get('/wells/:id', ah(async (req, res) => {
  const w = await wells.getWell(req.params.id);
  if (!w) return sendError(res, 'Well not found', 404);
  sendSuccess(res, w);
}));

router.get('/wells/:id/offsets', ah(async (req, res) => {
  sendSuccess(res, await offsets.getOffsets(req.params.id, radiusOf(req)));
}));

router.get('/wells/:id/hazard', ah(async (req, res) => {
  sendSuccess(res, await offsets.getHazardProfile(req.params.id, radiusOf(req)));
}));

/** Correlation panel: the well plus chosen offsets with tops and events. */
router.get('/wells/:id/correlation', ah(async (req, res) => {
  const radius = radiusOf(req);
  const off = await offsets.getOffsets(req.params.id, radius);
  const requested = String(req.query.ids ?? '').split(',').filter(Boolean);
  const chosen = requested.length ? off.offsets.filter((o) => requested.includes(o.id)) : off.offsets.slice(0, 5);
  const ids = [req.params.id, ...chosen.map((o) => o.id)];
  const [fm, evs] = await Promise.all([wells.getFormations(ids), wells.getEvents(ids)]);
  sendSuccess(res, {
    radiusKm: radius,
    available: off.offsets.map((o) => ({ id: o.id, name: o.name, nearestDistanceKm: o.nearestDistanceKm, eventCount: o.eventCount })),
    columns: [off.active, ...chosen].map((w: any) => ({
      id: w.id, name: w.name, field: w.field, status: w.status, profile: w.profile,
      distanceKm: w.nearestDistanceKm ?? 0, totalDepthFt: w.totalDepthFt ?? w.plannedTdFt, currentDepthFt: w.currentDepthFt,
      formations: fm.get(w.id) ?? [], events: evs.filter((e) => e.wellId === w.id),
    })),
  });
}));

router.get('/wells/:id/parameters', ah(async (req, res) => {
  const rows = await query(
    `SELECT * FROM drilling_parameters WHERE well_id = ? ORDER BY id DESC LIMIT ${Math.min(Number(req.query.limit ?? 400), 2000)}`, [req.params.id]);
  sendSuccess(res, rows.reverse());
}));

// ── Events ───────────────────────────────────────────────────
router.get('/events', ah(async (req, res) => {
  const c: string[] = ['e.verified = TRUE']; const p: any[] = [];
  if (req.query.type) { c.push('e.event_type = ?'); p.push(req.query.type); }
  if (req.query.formation) { c.push('e.formation_name = ?'); p.push(req.query.formation); }
  if (req.query.field) { c.push('w.field_name = ?'); p.push(req.query.field); }
  const rows = await query(
    `SELECT e.*, w.name AS well_name, d.title AS doc_title FROM operational_events e JOIN wells w ON w.id = e.well_id
     LEFT JOIN documents d ON d.id = e.source_document_id WHERE ${c.join(' AND ')} ORDER BY e.occurred_at DESC LIMIT 300`, p);
  sendSuccess(res, rows.map(wells.normalizeEvent));
}));

// ── Live eRTMAC replay ───────────────────────────────────────
router.get('/live/:wellId', ah(async (req, res) => {
  const s = await live.getLiveState(req.params.wellId);
  if (!s) return sendError(res, 'This well has no live feed', 404);
  sendSuccess(res, s);
}));

const controlSchema = z.object({ action: z.enum(['start', 'pause', 'reset', 'speed', 'radius']), value: z.number().optional() });
router.post('/live/:wellId/control', ah(async (req, res) => {
  const { action, value } = controlSchema.parse(req.body);
  sendSuccess(res, await live.controlLive(req.params.wellId, action, value));
}));

// ── Alerts ───────────────────────────────────────────────────
router.get('/alerts', ah(async (req, res) => {
  sendSuccess(res, await alerts.listAlerts({ wellId: req.query.wellId as string, status: req.query.status as string, limit: Number(req.query.limit ?? 100) }));
}));

const respondSchema = z.object({ action: z.enum(['acknowledge', 'false_alarm', 'resolve']), feedback: z.string().max(1000).optional() });
router.post('/alerts/:id/respond', ah(async (req, res) => {
  const { action, feedback } = respondSchema.parse(req.body);
  const a = await alerts.respond(req.params.id, req.user!.id, action, feedback);
  if (!a) return sendError(res, 'Alert not found', 404);
  const { getIO } = await import('../websocket');
  getIO().to(`well:${a.wellId}`).emit('alert:update', a);
  sendSuccess(res, a);
}));

// ── Knowledge ────────────────────────────────────────────────
const searchSchema = z.object({
  query: z.string().min(2).max(500),
  wellId: z.string().optional(), radiusKm: z.number().optional(),
  formation: z.string().optional(), eventType: z.string().optional(),
  depthMin: z.number().optional(), depthMax: z.number().optional(), limit: z.number().optional(),
});

async function scopedFilters(body: z.infer<typeof searchSchema>) {
  let wellIds: string[] | undefined;
  if (body.wellId && body.radiusKm) {
    const off = await offsets.getOffsets(body.wellId, body.radiusKm);
    wellIds = [body.wellId, ...off.offsets.map((o) => o.id)];
  }
  return { wellIds, formation: body.formation || undefined, eventType: body.eventType || undefined, depthMin: body.depthMin, depthMax: body.depthMax, limit: body.limit };
}

router.post('/knowledge/search', ah(async (req, res) => {
  const body = searchSchema.parse(req.body);
  sendSuccess(res, await knowledge.search(body.query, await scopedFilters(body)));
}));

router.post('/knowledge/ask', ah(async (req, res) => {
  const body = searchSchema.parse(req.body);
  sendSuccess(res, await knowledge.ask(body.query, await scopedFilters(body)));
}));

router.get('/knowledge/what-worked', ah(async (req, res) => {
  const type = String(req.query.type ?? '');
  if (!type) return sendError(res, 'type is required', 400);
  let ids: string[] = [];
  if (req.query.wellId) ids = (await offsets.getOffsets(String(req.query.wellId), radiusOf(req))).offsets.map((o) => o.id);
  sendSuccess(res, await offsets.whatWorked(type, (req.query.formation as string) || null, ids));
}));

// ── Documents ────────────────────────────────────────────────
router.get('/documents', ah(async (_req, res) => { sendSuccess(res, await documents.listDocuments()); }));

router.post('/documents', upload.single('file'), ah(async (req, res) => {
  if (!req.file) return sendError(res, 'Attach a PDF, image or text file in the "file" field.', 400);
  sendSuccess(res, await documents.createDocument(req.file, req.user!.id, req.body), 'Upload received — processing', 201);
}));

router.get('/documents/:id', ah(async (req, res) => {
  const d = await documents.getDocument(req.params.id);
  if (!d) return sendError(res, 'Document not found', 404);
  sendSuccess(res, d);
}));

router.post('/documents/:id/well', ah(async (req, res) => {
  const { wellId } = z.object({ wellId: z.string() }).parse(req.body);
  sendSuccess(res, await documents.setDocumentWell(req.params.id, wellId));
}));

const reviewSchema = z.object({ action: z.enum(['confirm', 'reject']), edits: z.record(z.any()).optional() });
router.post('/documents/items/:itemId/review', ah(async (req, res) => {
  const { action, edits } = reviewSchema.parse(req.body);
  sendSuccess(res, await documents.reviewItem(req.params.itemId, req.user!.id, action, edits));
}));

// ── Analytics ────────────────────────────────────────────────
router.get('/analytics/overview', ah(async (req, res) => {
  sendSuccess(res, await analytics.overview((req.query.field as string) || undefined));
}));

export default router;
