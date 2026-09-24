import { v4 as uuidv4 } from 'uuid';
import { eq, like, and, sql, asc, desc, getTableColumns } from 'drizzle-orm';
import { db } from '../db';
import { wells, well_formations, operational_events, documents, knowledge_chunks } from '../db/schema';

export type Well = typeof wells.$inferSelect;
export interface WellWithDistance extends Well { distance_km: number; }

// ── List wells ────────────────────────────────────────────────
export async function listWells(filters: {
  status?: string;
  field?: string;
  page: number;
  limit: number;
}): Promise<{ wells: Well[]; total: number }> {
  const conditions: any[] = [];
  if (filters.status) conditions.push(eq(wells.status, filters.status as Well['status']));
  if (filters.field)  conditions.push(like(wells.field_name, `%${filters.field}%`));

  const where = conditions.length ? and(...conditions) : undefined;
  const offset = (filters.page - 1) * filters.limit;

  const rows = await db.select({
    ...getTableColumns(wells),
    document_count: sql<number>`(SELECT COUNT(*) FROM documents d WHERE d.well_id = ${wells.id})`,
    knowledge_count: sql<number>`(SELECT COUNT(*) FROM knowledge_chunks k WHERE k.well_id = ${wells.id})`,
  }).from(wells)
    .where(where)
    .orderBy(desc(wells.created_at))
    .limit(filters.limit)
    .offset(offset);

  const [countRow] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(wells)
    .where(where);

  return { wells: rows as Well[], total: Number(countRow.total) };
}

export async function getGlobalWellStats(): Promise<{ wells: number; documents: number; knowledge: number }> {
  const [row] = await db.select({
    wells: sql<number>`(SELECT COUNT(*) FROM wells)`,
    documents: sql<number>`(SELECT COUNT(*) FROM documents)`,
    knowledge: sql<number>`(SELECT COUNT(*) FROM knowledge_chunks)`,
  }).from(wells).limit(1);
  return { wells: Number(row?.wells ?? 0), documents: Number(row?.documents ?? 0), knowledge: Number(row?.knowledge ?? 0) };
}

// ── Get single well with nested formations and recent events ──
export async function getWellById(id: string): Promise<(Well & {
  formations: any[];
  recent_events: any[];
}) | null> {
  const [well] = await db.select().from(wells).where(eq(wells.id, id)).limit(1);
  if (!well) return null;

  const formations = await db.select()
    .from(well_formations)
    .where(eq(well_formations.well_id, id))
    .orderBy(asc(well_formations.top_depth_ft));

  const recent_events = await db.select({
    id:             operational_events.id,
    event_type:     operational_events.event_type,
    severity:       operational_events.severity,
    start_depth_ft: operational_events.start_depth_ft,
    description:    operational_events.description,
    occurred_at:    operational_events.occurred_at,
  }).from(operational_events)
    .where(eq(operational_events.well_id, id))
    .orderBy(desc(operational_events.occurred_at))
    .limit(10);

  return { ...well, formations, recent_events };
}

// ── Nearby wells using Haversine (raw sql tag — math functions aren't in Drizzle core)
export async function getNearbyWells(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<WellWithDistance[]> {
  const result = await db.execute(sql`
    SELECT *,
      (6371 * ACOS(
        COS(RADIANS(${lat})) * COS(RADIANS(latitude))
        * COS(RADIANS(longitude) - RADIANS(${lng}))
        + SIN(RADIANS(${lat})) * SIN(RADIANS(latitude))
      )) AS distance_km
    FROM wells
    HAVING distance_km <= ${radiusKm}
    ORDER BY distance_km ASC`);
  return (result as any)[0] as WellWithDistance[];
}

// ── CRUD ──────────────────────────────────────────────────────
export async function createWell(data: Partial<Well>): Promise<Well> {
  const id = uuidv4();
  await db.insert(wells).values({
    id,
    name:              data.name!,
    well_number:       data.well_number      ?? null,
    field_name:        data.field_name!,
    block:             data.block            ?? null,
    operator:          data.operator         ?? 'Oil India Limited',
    latitude:          data.latitude!,
    longitude:         data.longitude!,
    elevation_m:       data.elevation_m      ?? null,
    total_depth_ft:    data.total_depth_ft   ?? null,
    status:            data.status           ?? 'active',
    spud_date:         data.spud_date        ?? null,
    completion_date:   data.completion_date  ?? null,
    primary_formation: data.primary_formation ?? null,
  });
  const [created] = await db.select().from(wells).where(eq(wells.id, id)).limit(1);
  return created;
}

export async function updateWell(id: string, data: Partial<Well>): Promise<Well> {
  const { id: _id, created_at: _ca, updated_at: _ua, ...updatable } = data as any;
  if (!Object.keys(updatable).length) throw Object.assign(new Error('No fields to update'), { statusCode: 400 });
  await db.update(wells).set(updatable).where(eq(wells.id, id));
  const [updated] = await db.select().from(wells).where(eq(wells.id, id)).limit(1);
  if (!updated) throw Object.assign(new Error('Well not found'), { statusCode: 404 });
  return updated;
}

export async function deleteWell(id: string): Promise<void> {
  const [existing] = await db.select({ id: wells.id }).from(wells).where(eq(wells.id, id)).limit(1);
  if (!existing) throw Object.assign(new Error('Well not found'), { statusCode: 404 });
  await db.delete(wells).where(eq(wells.id, id));
}

