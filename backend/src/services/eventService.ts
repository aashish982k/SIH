import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../config/db';

export async function listEvents(filters: {
  well_id?: string;
  event_type?: string;
  formation_id?: string;
  severity?: string;
  depth_min?: number;
  depth_max?: number;
  page: number;
  limit: number;
}): Promise<{ events: any[]; total: number }> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.well_id)     { conditions.push('oe.well_id = ?');        params.push(filters.well_id); }
  if (filters.event_type)  { conditions.push('oe.event_type = ?');     params.push(filters.event_type); }
  if (filters.formation_id){ conditions.push('oe.formation_id = ?');   params.push(filters.formation_id); }
  if (filters.severity)    { conditions.push('oe.severity = ?');       params.push(filters.severity); }
  if (filters.depth_min !== undefined) { conditions.push('oe.start_depth_ft >= ?'); params.push(filters.depth_min); }
  if (filters.depth_max !== undefined) { conditions.push('oe.start_depth_ft <= ?'); params.push(filters.depth_max); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (filters.page - 1) * filters.limit;

  const events = await query(
    `SELECT oe.*, w.name AS well_name, w.field_name, w.latitude, w.longitude, wf.formation_name
     FROM operational_events oe
     LEFT JOIN wells w ON oe.well_id = w.id
     LEFT JOIN well_formations wf ON oe.formation_id = wf.id
     ${where}
     ORDER BY oe.occurred_at DESC
     LIMIT ? OFFSET ?`,
    [...params, filters.limit, offset]
  );

  const [{ total }] = await query<{ total: number }>(
    `SELECT COUNT(*) AS total FROM operational_events oe ${where}`,
    params
  );

  return { events, total };
}

export async function getEventById(id: string): Promise<any | null> {
  const event = await queryOne(
    `SELECT oe.*, w.name AS well_name, w.field_name, w.latitude, w.longitude, wf.formation_name
     FROM operational_events oe
     LEFT JOIN wells w ON oe.well_id = w.id
     LEFT JOIN well_formations wf ON oe.formation_id = wf.id
     WHERE oe.id = ?`,
    [id]
  );
  return event ?? null;
}

export async function createEvent(data: any): Promise<any> {
  const id = uuidv4();
  await query(
    `INSERT INTO operational_events
       (id, well_id, formation_id, event_type, severity, start_depth_ft, end_depth_ft,
        description, cause, impact, mitigation, lessons_learned, outcome,
        duration_hours, npt_hours, occurred_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, data.well_id, data.formation_id ?? null, data.event_type, data.severity,
      data.start_depth_ft, data.end_depth_ft ?? null,
      data.description, data.cause ?? null, data.impact ?? null,
      data.mitigation ?? null, data.lessons_learned ?? null, data.outcome ?? null,
      data.duration_hours ?? null, data.npt_hours ?? null, data.occurred_at,
    ]
  );
  return getEventById(id);
}
