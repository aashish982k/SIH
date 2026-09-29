import { sql } from 'drizzle-orm';
import { db } from '../config/db';
import { FORMATIONS } from '../domain/stratigraphy';
import { EVENT_LABELS } from '../domain/taxonomy';

export async function overview(field?: string) {
  const fieldParam = field ?? null;

  const fwJoin  = field ? sql`AND w.field_name = ${field}` : sql``;
  const fwWhere = field ? sql`WHERE w.field_name = ${field}` : sql``;

  const { rows: totalsRows } = await db.execute(sql`
    SELECT COUNT(DISTINCT w.id) AS wells, COUNT(e.id) AS events,
           COALESCE(SUM(e.npt_hours), 0) AS npt,
           SUM(CASE WHEN e.severity IN ('high','critical') THEN 1 ELSE 0 END) AS severe
    FROM wells w
    LEFT JOIN operational_events e ON e.well_id = w.id AND e.verified = TRUE
    WHERE w.status <> 'drilling' ${fwJoin}
  `) as any;
  const totals = totalsRows[0];

  const { rows: matrix } = await db.execute(sql`
    SELECT e.formation_name AS formation, e.event_type AS type,
           COUNT(*) AS n, SUM(e.npt_hours) AS npt, COUNT(DISTINCT e.well_id) AS wells
    FROM operational_events e
    JOIN wells w ON w.id = e.well_id
    WHERE e.verified = TRUE ${fwJoin}
    GROUP BY e.formation_name, e.event_type
  `) as any;

  const { rows: penetrations } = await db.execute(sql`
    SELECT f.formation_name AS formation, COUNT(DISTINCT f.well_id) AS wells
    FROM well_formations f
    JOIN wells w ON w.id = f.well_id
    WHERE f.is_predicted = FALSE ${fwJoin}
    GROUP BY f.formation_name
  `) as any;

  const { rows: byField } = await db.execute(sql`
    SELECT w.field_name AS field, COUNT(DISTINCT w.id) AS wells,
           COUNT(e.id) AS events, COALESCE(SUM(e.npt_hours), 0) AS npt
    FROM wells w
    LEFT JOIN operational_events e ON e.well_id = w.id
    WHERE w.status <> 'drilling'
    GROUP BY w.field_name
    ORDER BY npt DESC
  `) as any;

  const { rows: mitigations } = await db.execute(sql`
    SELECT e.event_type AS type, e.mitigation_key AS mkey, COUNT(*) AS uses,
           AVG(CASE e.outcome_rating WHEN 'resolved' THEN 1 WHEN 'partial' THEN 0.5 ELSE 0 END) AS success,
           AVG(e.npt_hours) AS avg_npt
    FROM operational_events e
    JOIN wells w ON w.id = e.well_id
    WHERE e.mitigation_key IS NOT NULL ${fwJoin}
    GROUP BY e.event_type, e.mitigation_key
    HAVING COUNT(*) >= 2
    ORDER BY e.event_type, success DESC
  `) as any;

  const { rows: worstWells } = await db.execute(sql`
    SELECT w.id, w.name, w.field_name AS field, w.total_npt_hours AS npt, COUNT(e.id) AS events
    FROM wells w
    LEFT JOIN operational_events e ON e.well_id = w.id
    WHERE w.status <> 'drilling' ${fwJoin}
    GROUP BY w.id
    ORDER BY w.total_npt_hours DESC
    LIMIT 8
  `) as any;

  const pen = new Map(penetrations.map((p: any) => [p.formation, Number(p.wells)]));
  return {
    totals: {
      wells: Number(totals.wells), events: Number(totals.events),
      nptHours: Math.round(Number(totals.npt)), severe: Number(totals.severe),
    },
    formations: FORMATIONS.map((f) => ({ name: f.name, color: f.color, wellsPenetrated: pen.get(f.name) ?? 0 })),
    eventTypes: Object.entries(EVENT_LABELS).map(([key, label]) => ({ key, label })),
    matrix: matrix.map((m: any) => ({
      formation: m.formation, type: m.type, count: Number(m.n),
      nptHours: Math.round(Number(m.npt) * 10) / 10, wells: Number(m.wells),
      rate: pen.get(m.formation) ? Math.round((Number(m.wells) / Number(pen.get(m.formation))) * 100) / 100 : null,
    })),
    byField: byField.map((f: any) => ({
      field: f.field, wells: Number(f.wells), events: Number(f.events), nptHours: Math.round(Number(f.npt)),
    })),
    mitigations: mitigations.map((m: any) => ({
      type: m.type, key: m.mkey, uses: Number(m.uses),
      successRate: Math.round(Number(m.success) * 100) / 100,
      avgNptHours: Math.round(Number(m.avg_npt) * 10) / 10,
    })),
    worstWells: worstWells.map((w: any) => ({
      id: w.id, name: w.name, field: w.field, nptHours: Number(w.npt), events: Number(w.events),
    })),
  };
}
