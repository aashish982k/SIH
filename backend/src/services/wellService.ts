import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../config/db';

export interface Well {
  id: string;
  name: string;
  well_number: string | null;
  field_name: string;
  block: string | null;
  operator: string;
  latitude: number;
  longitude: number;
  elevation_m: number | null;
  total_depth_ft: number | null;
  status: string;
  spud_date: string | null;
  completion_date: string | null;
  primary_formation: string | null;
  created_at: string;
  updated_at: string;
}

export interface WellWithDistance extends Well {
  distance_km: number;
}

// ── List wells ────────────────────────────────────────────────
export async function listWells(filters: {
  status?: string;
  field?: string;
  page: number;
  limit: number;
}): Promise<{ wells: Well[]; total: number }> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.status) { conditions.push('status = ?'); params.push(filters.status); }
  if (filters.field)  { conditions.push('field_name LIKE ?'); params.push(`%${filters.field}%`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (filters.page - 1) * filters.limit;

  const wells = await query<Well>(
    `SELECT * FROM wells ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, filters.limit, offset]
  );

  const [{ total }] = await query<{ total: number }>(
    `SELECT COUNT(*) AS total FROM wells ${where}`,
    params
  );

  return { wells, total };
}

// ── Get single well with nested formations and recent events ──
export async function getWellById(id: string): Promise<Well & {
  formations: any[];
  recent_events: any[];
} | null> {
  const well = await queryOne<Well>('SELECT * FROM wells WHERE id = ?', [id]);
  if (!well) return null;

  const formations = await query(
    'SELECT * FROM well_formations WHERE well_id = ? ORDER BY top_depth_ft',
    [id]
  );

  const recent_events = await query(
    `SELECT id, event_type, severity, start_depth_ft, description, occurred_at
     FROM operational_events WHERE well_id = ? ORDER BY occurred_at DESC LIMIT 10`,
    [id]
  );

  return { ...well, formations, recent_events };
}

// ── Nearby wells using MySQL Haversine formula ─────────────────
export async function getNearbyWells(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<WellWithDistance[]> {
  // Uses the Haversine formula entirely inside MySQL — no JS filtering
  return query<WellWithDistance>(
    `SELECT *,
       (6371 * ACOS(
         COS(RADIANS(?)) * COS(RADIANS(latitude))
         * COS(RADIANS(longitude) - RADIANS(?))
         + SIN(RADIANS(?)) * SIN(RADIANS(latitude))
       )) AS distance_km
     FROM wells
     HAVING distance_km <= ?
     ORDER BY distance_km ASC`,
    [lat, lng, lat, radiusKm]
  );
}

// ── CRUD ──────────────────────────────────────────────────────
export async function createWell(data: Partial<Well>): Promise<Well> {
  const id = uuidv4();
  await query(
    `INSERT INTO wells (id, name, well_number, field_name, block, operator, latitude, longitude,
       elevation_m, total_depth_ft, status, spud_date, completion_date, primary_formation)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, data.name, data.well_number ?? null, data.field_name, data.block ?? null,
      data.operator ?? 'Oil India Limited', data.latitude, data.longitude,
      data.elevation_m ?? null, data.total_depth_ft ?? null,
      data.status ?? 'active', data.spud_date ?? null,
      data.completion_date ?? null, data.primary_formation ?? null,
    ]
  );
  return (await queryOne<Well>('SELECT * FROM wells WHERE id = ?', [id]))!;
}

export async function updateWell(id: string, data: Partial<Well>): Promise<Well> {
  const fields = Object.entries(data)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => `${k} = ?`);

  if (!fields.length) throw Object.assign(new Error('No fields to update'), { statusCode: 400 });

  await query(
    `UPDATE wells SET ${fields.join(', ')} WHERE id = ?`,
    [...Object.values(data).filter((v) => v !== undefined), id]
  );

  const updated = await queryOne<Well>('SELECT * FROM wells WHERE id = ?', [id]);
  if (!updated) throw Object.assign(new Error('Well not found'), { statusCode: 404 });
  return updated;
}

export async function deleteWell(id: string): Promise<void> {
  const well = await queryOne('SELECT id FROM wells WHERE id = ?', [id]);
  if (!well) throw Object.assign(new Error('Well not found'), { statusCode: 404 });
  await query('DELETE FROM wells WHERE id = ?', [id]);
}
