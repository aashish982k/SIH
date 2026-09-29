import { eq, inArray, sql, and, asc } from 'drizzle-orm';
import { db } from '../config/db';
import {
  wells, well_formations, well_surveys, operational_events, documents,
  casing_sections, cement_jobs, mud_programs,
} from '../db/schema';
import { FORMATION_BY_NAME } from '../domain/stratigraphy';

const num = (v: any) => (v == null ? null : Number(v));

export function normalizeWell(w: any) {
  return {
    id: w.id, name: w.name, field: w.field_name, block: w.block, pad: w.pad, operator: w.operator,
    wellType: w.well_type, profile: w.profile, status: w.status,
    lat: Number(w.latitude), lon: Number(w.longitude), kbElevationM: num(w.kb_elevation_m),
    totalDepthFt: num(w.total_depth_ft), plannedTdFt: num(w.planned_td_ft), currentDepthFt: num(w.current_depth_ft),
    spudDate: w.spud_date, completionDate: w.completion_date, totalNptHours: num(w.total_npt_hours) ?? 0,
    eventCount: w.event_count != null ? Number(w.event_count) : undefined,
    severeCount: w.severe_count != null ? Number(w.severe_count) : undefined,
  };
}

export async function listWells(filters: { status?: string; field?: string } = {}) {
  // Use raw SQL for the aggregate — simpler than composing Drizzle aggregates with LEFT JOIN
  const conditions: string[] = [];
  const params: any[] = [];
  if (filters.status) { conditions.push(`w.status = $${params.length + 1}`); params.push(filters.status); }
  if (filters.field)  { conditions.push(`w.field_name = $${params.length + 1}`); params.push(filters.field); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await db.execute(sql.raw(
    `SELECT w.*,
            COUNT(e.id) AS event_count,
            SUM(CASE WHEN e.severity IN ('high','critical') THEN 1 ELSE 0 END) AS severe_count
     FROM wells w
     LEFT JOIN operational_events e ON e.well_id = w.id
     ${where}
     GROUP BY w.id
     ORDER BY (w.status = 'drilling') DESC, w.field_name, w.name`
  )) as any;
  return rows.map(normalizeWell);
}

export async function getFormations(wellIds: string[]) {
  if (!wellIds.length) return new Map<string, any[]>();
  const rows = await db.select()
    .from(well_formations)
    .where(inArray(well_formations.well_id, wellIds))
    .orderBy(asc(well_formations.well_id), asc(well_formations.seq));

  const map = new Map<string, any[]>();
  for (const r of rows) {
    const list = map.get(r.well_id!) ?? [];
    list.push({
      name: r.formation_name, seq: r.seq, lithology: r.lithology,
      color: FORMATION_BY_NAME.get(r.formation_name)?.color ?? '#888',
      topMd: Number(r.top_md_ft), bottomMd: num(r.bottom_md_ft),
      topTvd: Number(r.top_tvd_ft), bottomTvd: num(r.bottom_tvd_ft),
      predicted: !!r.is_predicted,
    });
    map.set(r.well_id!, list);
  }
  return map;
}

export async function getSurveys(wellIds: string[]) {
  if (!wellIds.length) return new Map<string, any[]>();
  const rows = await db.select()
    .from(well_surveys)
    .where(inArray(well_surveys.well_id, wellIds))
    .orderBy(asc(well_surveys.well_id), asc(well_surveys.md_ft));

  const map = new Map<string, any[]>();
  for (const r of rows) {
    const list = map.get(r.well_id) ?? [];
    list.push({
      md: Number(r.md_ft), inc: Number(r.inclination_deg), azi: Number(r.azimuth_deg),
      tvd: Number(r.tvd_ft), north: Number(r.north_ft), east: Number(r.east_ft),
    });
    map.set(r.well_id, list);
  }
  return map;
}

export function normalizeEvent(e: any) {
  return {
    id: e.id, wellId: e.well_id, wellName: e.well_name, formation: e.formation_name,
    type: e.event_type, severity: e.severity,
    depthMd: Number(e.depth_md_ft), depthTvd: num(e.depth_tvd_ft) ?? Number(e.depth_md_ft),
    description: e.description, cause: e.cause, mitigation: e.mitigation, mitigationKey: e.mitigation_key,
    outcome: e.outcome, outcomeRating: e.outcome_rating, lessons: e.lessons_learned, nptHours: num(e.npt_hours),
    occurredAt: e.occurred_at, sourceDocumentId: e.source_document_id,
    sourceDocumentTitle: e.doc_title ?? null, sourcePage: e.source_page,
  };
}

export async function getEvents(wellIds: string[]) {
  if (!wellIds.length) return [];
  const { rows } = await db.execute(sql`
    SELECT e.*, w.name AS well_name, d.title AS doc_title
    FROM operational_events e
    JOIN wells w ON w.id = e.well_id
    LEFT JOIN documents d ON d.id = e.source_document_id
    WHERE e.verified = TRUE
      AND e.well_id IN (${sql.join(wellIds.map(id => sql`${id}`), sql`, `)})
    ORDER BY e.depth_md_ft
  `) as any;
  return rows.map(normalizeEvent);
}

export async function getWell(id: string) {
  const [w] = await db.select().from(wells).where(eq(wells.id, id)).limit(1);
  if (!w) return null;

  const [formations, surveys, events, casing, cement, mud, docs] = await Promise.all([
    getFormations([id]),
    getSurveys([id]),
    getEvents([id]),
    db.select().from(casing_sections).where(eq(casing_sections.well_id, id))
      .orderBy(asc(casing_sections.shoe_md_ft)),
    db.execute(sql`
      SELECT c.*, s.size_label FROM cement_jobs c
      LEFT JOIN casing_sections s ON s.id = c.casing_section_id
      WHERE c.well_id = ${id}
    `),
    db.select().from(mud_programs).where(eq(mud_programs.well_id, id))
      .orderBy(asc(mud_programs.depth_from_ft)),
    db.select({
      id: documents.id, title: documents.title, document_type: documents.document_type,
      document_date: documents.document_date, page_count: documents.page_count, status: documents.status,
    }).from(documents).where(eq(documents.well_id, id)),
  ]);

  const cementRows = (cement as any).rows ?? [];

  return {
    ...normalizeWell(w),
    formations: formations.get(id) ?? [],
    surveys: surveys.get(id) ?? [],
    events,
    casing: casing.map((c) => ({
      id: c.id, type: c.casing_type, size: c.size_label, odIn: Number(c.outer_dia_in),
      grade: c.grade, weight: num(c.weight_lb_ft), topMd: Number(c.top_md_ft), shoeMd: Number(c.shoe_md_ft),
    })),
    cement: cementRows.map((c: any) => ({
      id: c.id, casing: c.size_label, tocFt: num(c.top_of_cement_ft),
      densityPpg: num(c.slurry_density_ppg),
      returns: c.returns_obtained == null ? null : !!c.returns_obtained,
      result: c.result, issues: c.issues,
    })),
    mud: mud.map((m) => ({
      fromFt: Number(m.depth_from_ft), toFt: Number(m.depth_to_ft),
      type: m.mud_type, weightPpg: Number(m.mud_weight_ppg), lossBbl: num(m.total_loss_bbl),
    })),
    documents: docs,
  };
}
