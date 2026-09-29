import { v4 as uuidv4 } from 'uuid';
import { eq, inArray, and, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { alerts, wells, users } from '../db/schema';

export function normalizeAlert(a: any) {
  const parse = (v: any) => (v == null ? null : typeof v === 'string' ? JSON.parse(v) : v);
  return {
    id: a.id, wellId: a.well_id, wellName: a.well_name, kind: a.kind, riskType: a.risk_type, severity: a.severity,
    probability: Number(a.probability), bitDepthFt: Number(a.bit_depth_ft),
    zoneTopFt: a.zone_top_ft != null ? Number(a.zone_top_ft) : null,
    zoneBaseFt: a.zone_base_ft != null ? Number(a.zone_base_ft) : null,
    formation: a.formation_name, title: a.title, message: a.message,
    evidence: parse(a.evidence), recommendations: parse(a.recommendations),
    status: a.status, feedback: a.feedback, acknowledgedAt: a.acknowledged_at,
    acknowledgedBy: a.ack_name ?? null,
    createdAt: a.created_at, updatedAt: a.updated_at,
  };
}

async function alertWithJoins(id: string) {
  const { rows } = await db.execute(sql`
    SELECT a.*, w.name AS well_name, u.name AS ack_name
    FROM alerts a
    JOIN wells w ON w.id = a.well_id
    LEFT JOIN users u ON u.id = a.acknowledged_by
    WHERE a.id = ${id}
    LIMIT 1
  `) as any;
  return rows[0] ? normalizeAlert(rows[0]) : null;
}

export async function createAlert(a: {
  wellId: string; kind: 'lookahead' | 'live'; riskType: string; severity: string;
  probability: number; bitDepthFt: number;
  zoneTopFt?: number | null; zoneBaseFt?: number | null; formation?: string | null;
  title: string; message: string; evidence?: any; recommendations?: any;
}) {
  const [row] = await db.insert(alerts).values({
    id: uuidv4(),
    well_id: a.wellId,
    kind: a.kind,
    risk_type: a.riskType,
    severity: a.severity as any,
    probability: String(a.probability.toFixed(4)),
    bit_depth_ft: String(a.bitDepthFt),
    zone_top_ft: a.zoneTopFt != null ? String(a.zoneTopFt) : null,
    zone_base_ft: a.zoneBaseFt != null ? String(a.zoneBaseFt) : null,
    formation_name: a.formation ?? null,
    title: a.title,
    message: a.message,
    evidence: a.evidence ?? null,
    recommendations: a.recommendations ?? null,
  }).returning({ id: alerts.id });
  return alertWithJoins(row.id);
}

export async function updateAlert(id: string, fields: {
  probability?: number; severity?: string; message?: string; status?: string; evidence?: any;
}) {
  const setValues: any = {};
  if (fields.probability != null) setValues.probability = String(fields.probability.toFixed(4));
  if (fields.severity)            setValues.severity = fields.severity as any;
  if (fields.message)             setValues.message = fields.message;
  if (fields.status)              setValues.status = fields.status as any;
  if (fields.evidence !== undefined) setValues.evidence = fields.evidence;
  if (!Object.keys(setValues).length) return alertWithJoins(id);
  await db.update(alerts).set(setValues).where(eq(alerts.id, id));
  return alertWithJoins(id);
}

export async function getAlert(id: string) {
  return alertWithJoins(id);
}

export async function listAlerts(filters: { wellId?: string; status?: string; limit?: number } = {}) {
  const condChunks = [];
  if (filters.wellId) condChunks.push(sql`a.well_id = ${filters.wellId}`);
  if (filters.status === 'open') {
    condChunks.push(sql`a.status IN ('active','acknowledged')`);
  } else if (filters.status) {
    condChunks.push(sql`a.status = ${filters.status}`);
  }
  const limit = Math.min(filters.limit ?? 100, 500);
  const whereClause = condChunks.length > 0 ? sql`WHERE ${sql.join(condChunks, sql` AND `)}` : sql``;

  const { rows } = await db.execute(sql`
    SELECT a.*, w.name AS well_name, u.name AS ack_name
    FROM alerts a
    JOIN wells w ON w.id = a.well_id
    LEFT JOIN users u ON u.id = a.acknowledged_by
    ${whereClause}
    ORDER BY a.created_at DESC
    LIMIT ${limit}
  `) as any;
  return rows.map(normalizeAlert);
}

export async function respond(
  id: string, userId: string,
  action: 'acknowledge' | 'false_alarm' | 'resolve',
  feedback?: string
) {
  const status = action === 'acknowledge' ? 'acknowledged'
    : action === 'false_alarm' ? 'false_alarm'
    : 'resolved';
  await db.update(alerts)
    .set({
      status: status as any,
      feedback: feedback ?? undefined,
      acknowledged_by: userId,
      acknowledged_at: new Date(),
    })
    .where(eq(alerts.id, id));
  return alertWithJoins(id);
}
