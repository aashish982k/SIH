import { v4 as uuidv4 } from 'uuid';
import { eq, and, gte, lte, desc, sql, getTableColumns } from 'drizzle-orm';
import { db } from '../db';
import { operational_events, wells, well_formations } from '../db/schema';

export type OperationalEvent = typeof operational_events.$inferSelect;

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
  const conditions: any[] = [];
  
  if (filters.well_id)     conditions.push(eq(operational_events.well_id, filters.well_id));
  if (filters.event_type)  conditions.push(eq(operational_events.event_type, filters.event_type as OperationalEvent['event_type']));
  if (filters.formation_id)conditions.push(eq(operational_events.formation_id, filters.formation_id));
  if (filters.severity)    conditions.push(eq(operational_events.severity, filters.severity as OperationalEvent['severity']));
  if (filters.depth_min !== undefined) conditions.push(gte(operational_events.start_depth_ft, String(filters.depth_min)));
  if (filters.depth_max !== undefined) conditions.push(lte(operational_events.start_depth_ft, String(filters.depth_max)));

  const where = conditions.length ? and(...conditions) : undefined;
  const offset = (filters.page - 1) * filters.limit;

  const rows = await db.select({
    ...getTableColumns(operational_events),
    well_name: wells.name,
    formation_name: well_formations.formation_name,
  })
    .from(operational_events)
    .leftJoin(wells, eq(operational_events.well_id, wells.id))
    .leftJoin(well_formations, eq(operational_events.formation_id, well_formations.id))
    .where(where)
    .orderBy(desc(operational_events.occurred_at))
    .limit(filters.limit)
    .offset(offset);

  const [countRow] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(operational_events)
    .where(where);

  return { events: rows, total: Number(countRow.total) };
}

export async function getEventById(id: string): Promise<any | null> {
  const [event] = await db.select({
    ...getTableColumns(operational_events),
    well_name: wells.name,
    formation_name: well_formations.formation_name,
  })
    .from(operational_events)
    .leftJoin(wells, eq(operational_events.well_id, wells.id))
    .leftJoin(well_formations, eq(operational_events.formation_id, well_formations.id))
    .where(eq(operational_events.id, id))
    .limit(1);

  return event ?? null;
}

export async function createEvent(data: any): Promise<any> {
  const id = uuidv4();
  await db.insert(operational_events).values({
    id,
    well_id:         data.well_id,
    formation_id:    data.formation_id ?? null,
    event_type:      data.event_type,
    severity:        data.severity ?? 'medium',
    start_depth_ft:  String(data.start_depth_ft),
    end_depth_ft:    data.end_depth_ft != null ? String(data.end_depth_ft) : null,
    description:     data.description,
    cause:           data.cause ?? null,
    impact:          data.impact ?? null,
    mitigation:      data.mitigation ?? null,
    lessons_learned: data.lessons_learned ?? null,
    outcome:         data.outcome ?? null,
    duration_hours:  data.duration_hours != null ? String(data.duration_hours) : null,
    npt_hours:       data.npt_hours != null ? String(data.npt_hours) : null,
    occurred_at:     new Date(data.occurred_at),
  });
  return getEventById(id);
}
