import { v4 as uuidv4 } from 'uuid';
import { eq, like, and, sql, asc, desc, getTableColumns } from 'drizzle-orm';
import { db } from '../db';
import { wells, well_formations, operational_events, documents, knowledge_chunks, field_contributions, users } from '../db/schema';

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
  contributions: Array<{
    id: string;
    field_name: string;
    filled_by: string;
    filled_by_name: string;
    filled_at: Date;
    new_value: string;
    reversed_at: Date | null;
  }>;
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

  const contributions = await db.select({
    id: field_contributions.id,
    field_name: field_contributions.field_name,
    filled_by: field_contributions.filled_by,
    filled_by_name: users.name,
    filled_at: field_contributions.filled_at,
    new_value: field_contributions.new_value,
    reversed_at: field_contributions.reversed_at,
  }).from(field_contributions)
    .innerJoin(users, eq(users.id, field_contributions.filled_by))
    .where(eq(field_contributions.well_id, id))
    .orderBy(desc(field_contributions.filled_at));

  return { ...well, formations, recent_events, contributions };
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
      + CASE WHEN location_precision = 'approximate' THEN 50 ELSE 0 END
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

const FILLABLE_FIELDS = [
  'field_name', 'block', 'operator', 'elevation_m', 'total_depth_ft',
  'status', 'spud_date', 'completion_date', 'primary_formation',
] as const;
type FillableField = typeof FILLABLE_FIELDS[number];

function isEmptyWellValue(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

function valuesMatch(field: string, current: unknown, recorded: string): boolean {
  if (field === 'elevation_m' || field === 'total_depth_ft') {
    return Number(current) === Number(recorded);
  }
  return String(current) === recorded;
}

export async function fillEmptyWellFields(
  wellId: string,
  userId: string,
  input: Record<string, unknown>,
): Promise<{ well: Well; contributions: typeof field_contributions.$inferSelect[] }> {
  const restrictedFields = ['name', 'latitude', 'longitude', 'well_number'];
  const invalidFields = Object.keys(input).filter((field) => !FILLABLE_FIELDS.includes(field as FillableField));
  if (invalidFields.length > 0) {
    const restricted = invalidFields.filter((field) => restrictedFields.includes(field));
    const fields = (restricted.length ? restricted : invalidFields).join(', ');
    throw Object.assign(new Error(`${fields} cannot be updated through the fill-empty-fields endpoint`), { statusCode: 400 });
  }

  const requested = Object.entries(input) as Array<[FillableField, unknown]>;
  if (!requested.length) throw Object.assign(new Error('At least one empty well field is required'), { statusCode: 400 });

  return db.transaction(async (tx) => {
    const [well] = await tx.select().from(wells).where(eq(wells.id, wellId)).limit(1);
    if (!well) throw Object.assign(new Error('Well not found'), { statusCode: 404 });

    const overwrite = requested.find(([field]) => !isEmptyWellValue(well[field]));
    if (overwrite) {
      throw Object.assign(new Error(`${overwrite[0]} is already populated and cannot be overwritten through this endpoint`), { statusCode: 400 });
    }

    const updates: Record<string, unknown> = {};
    const rows: Array<typeof field_contributions.$inferInsert> = [];
    const filledAt = new Date();
    for (const [field, value] of requested) {
      if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) {
        throw Object.assign(new Error(`${field} must contain a value`), { statusCode: 400 });
      }
      updates[field] = value;
      rows.push({
        id: uuidv4(),
        well_id: wellId,
        field_name: field,
        filled_by: userId,
        filled_at: filledAt,
        previous_value: isEmptyWellValue(well[field]) ? null : String(well[field]),
        new_value: String(value),
      });
    }

    await tx.update(wells).set(updates as Partial<typeof wells.$inferInsert>).where(eq(wells.id, wellId));
    await tx.insert(field_contributions).values(rows);
    const [updated] = await tx.select().from(wells).where(eq(wells.id, wellId)).limit(1);
    return { well: updated, contributions: rows as typeof field_contributions.$inferSelect[] };
  });
}

export async function reverseFieldContribution(
  contributionId: string,
  userId: string,
  isAdmin: boolean,
): Promise<Well> {
  return db.transaction(async (tx) => {
    const [contribution] = await tx.select().from(field_contributions)
      .where(eq(field_contributions.id, contributionId)).limit(1);
    if (!contribution) throw Object.assign(new Error('Contribution not found'), { statusCode: 404 });
    if (contribution.reversed_at) throw Object.assign(new Error('Contribution has already been reversed'), { statusCode: 400 });
    if (contribution.filled_by !== userId && !isAdmin) {
      throw Object.assign(new Error('Only the contributor or an administrator can reverse this contribution'), { statusCode: 403 });
    }

    const [well] = await tx.select().from(wells).where(eq(wells.id, contribution.well_id)).limit(1);
    if (!well) throw Object.assign(new Error('Well not found'), { statusCode: 404 });
    const currentValue = well[contribution.field_name as FillableField];
    if (!valuesMatch(contribution.field_name, currentValue, contribution.new_value)) {
      throw Object.assign(new Error('This contribution is stale and cannot clear a newer value'), { statusCode: 409 });
    }

    await tx.update(wells)
      .set({ [contribution.field_name]: contribution.previous_value } as Partial<typeof wells.$inferInsert>)
      .where(eq(wells.id, contribution.well_id));
    await tx.update(field_contributions)
      .set({ reversed_at: new Date(), reversed_by: userId })
      .where(eq(field_contributions.id, contributionId));
    const [updated] = await tx.select().from(wells).where(eq(wells.id, contribution.well_id)).limit(1);
    return updated;
  });
}

export async function deleteWell(id: string): Promise<void> {
  const [existing] = await db.select({ id: wells.id }).from(wells).where(eq(wells.id, id)).limit(1);
  if (!existing) throw Object.assign(new Error('Well not found'), { statusCode: 404 });
  await db.delete(wells).where(eq(wells.id, id));
}
