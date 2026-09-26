import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../config/db';

export function normalizeAlert(a: any) {
  const parse = (v: any) => (v == null ? null : typeof v === 'string' ? JSON.parse(v) : v);
  return {
    id: a.id, wellId: a.well_id, wellName: a.well_name, kind: a.kind, riskType: a.risk_type, severity: a.severity,
    probability: Number(a.probability), bitDepthFt: Number(a.bit_depth_ft),
    zoneTopFt: a.zone_top_ft != null ? Number(a.zone_top_ft) : null, zoneBaseFt: a.zone_base_ft != null ? Number(a.zone_base_ft) : null,
    formation: a.formation_name, title: a.title, message: a.message,
    evidence: parse(a.evidence), recommendations: parse(a.recommendations),
    status: a.status, feedback: a.feedback, acknowledgedAt: a.acknowledged_at, acknowledgedBy: a.ack_name ?? null,
    createdAt: a.created_at, updatedAt: a.updated_at,
  };
}

export async function createAlert(a: {
  wellId: string; kind: 'lookahead' | 'live'; riskType: string; severity: string; probability: number; bitDepthFt: number;
  zoneTopFt?: number | null; zoneBaseFt?: number | null; formation?: string | null; title: string; message: string; evidence?: any; recommendations?: any;
}) {
  const id = uuidv4();
  await query(
    `INSERT INTO alerts (id, well_id, kind, risk_type, severity, probability, bit_depth_ft, zone_top_ft, zone_base_ft, formation_name, title, message, evidence, recommendations)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, a.wellId, a.kind, a.riskType, a.severity, a.probability.toFixed(4), a.bitDepthFt, a.zoneTopFt ?? null, a.zoneBaseFt ?? null, a.formation ?? null,
      a.title, a.message, JSON.stringify(a.evidence ?? null), JSON.stringify(a.recommendations ?? null)]
  );
  return getAlert(id);
}

export async function updateAlert(id: string, fields: { probability?: number; severity?: string; message?: string; status?: string; evidence?: any }) {
  const sets: string[] = []; const p: any[] = [];
  if (fields.probability != null) { sets.push('probability = ?'); p.push(fields.probability.toFixed(4)); }
  if (fields.severity) { sets.push('severity = ?'); p.push(fields.severity); }
  if (fields.message) { sets.push('message = ?'); p.push(fields.message); }
  if (fields.status) { sets.push('status = ?'); p.push(fields.status); }
  if (fields.evidence !== undefined) { sets.push('evidence = ?'); p.push(JSON.stringify(fields.evidence)); }
  if (!sets.length) return getAlert(id);
  await query(`UPDATE alerts SET ${sets.join(', ')} WHERE id = ?`, [...p, id]);
  return getAlert(id);
}

export async function getAlert(id: string) {
  const a = await queryOne(`SELECT a.*, w.name AS well_name, u.name AS ack_name FROM alerts a JOIN wells w ON w.id = a.well_id LEFT JOIN users u ON u.id = a.acknowledged_by WHERE a.id = ?`, [id]);
  return a ? normalizeAlert(a) : null;
}

export async function listAlerts(filters: { wellId?: string; status?: string; limit?: number } = {}) {
  const c: string[] = []; const p: any[] = [];
  if (filters.wellId) { c.push('a.well_id = ?'); p.push(filters.wellId); }
  if (filters.status === 'open') c.push(`a.status IN ('active','acknowledged')`);
  else if (filters.status) { c.push('a.status = ?'); p.push(filters.status); }
  const rows = await query(
    `SELECT a.*, w.name AS well_name, u.name AS ack_name FROM alerts a JOIN wells w ON w.id = a.well_id LEFT JOIN users u ON u.id = a.acknowledged_by
     ${c.length ? `WHERE ${c.join(' AND ')}` : ''} ORDER BY a.created_at DESC LIMIT ${Math.min(filters.limit ?? 100, 500)}`, p);
  return rows.map(normalizeAlert);
}

export async function respond(id: string, userId: string, action: 'acknowledge' | 'false_alarm' | 'resolve', feedback?: string) {
  const status = action === 'acknowledge' ? 'acknowledged' : action === 'false_alarm' ? 'false_alarm' : 'resolved';
  await query(`UPDATE alerts SET status = ?, feedback = COALESCE(?, feedback), acknowledged_by = ?, acknowledged_at = UTC_TIMESTAMP() WHERE id = ?`, [status, feedback ?? null, userId, id]);
  return getAlert(id);
}
