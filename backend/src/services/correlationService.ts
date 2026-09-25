import { eq, ne, inArray, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import { wells, operational_events, well_formations } from '../db/schema';

/**
 * Offset-well correlation (READEME §13-16 / implementation.md §7).
 *
 * Combines four signals — geographic proximity is NOT used alone:
 *   1. geographic distance (Haversine in SQL)
 *   2. depth similarity: events near the active well's current depth
 *   3. formation similarity: events in the same formation
 *   4. historical event similarity: same event types as the current concern
 *
 * Final relevance = weighted score in [0, 1] per nearby well, with evidence
 * attached (which events matched, at which depths/formations).
 */

export interface CorrelationInput {
  latitude: number;
  longitude: number;
  radiusKm: number;
  currentDepthFt?: number;
  currentFormation?: string | null;
  excludeWellId?: string;
  limit?: number;
  depthToleranceFt?: number;
}

export interface CorrelatedWell {
  id: string;
  name: string;
  field_name: string;
  block: string | null;
  status: string;
  latitude: number;
  longitude: number;
  location_precision: 'exact' | 'approximate';
  distance_km: number;
  relevance_score: number;
  evidence: {
    formation_match_events: Array<{ id: string; event_type: string; severity: string; start_depth_ft: number; description: string }>;
    depth_match_events: Array<{ id: string; event_type: string; severity: string; start_depth_ft: number; description: string }>;
    event_type_counts: Record<string, number>;
    total_events: number;
    formation_overlap: string[];
    location_precision: 'exact' | 'approximate';
    distance_component: number;
    discounted_distance_component: number;
  };
}

// Weights (sum to 1). Configurable here rather than magic numbers inline.
const W_DISTANCE = 0.25;
const W_DEPTH = 0.3;
const W_FORMATION = 0.25;
const W_EVENT_TYPES = 0.2;
const APPROXIMATE_RADIUS_BUFFER_KM = 50;

export class CorrelationService {
  /**
   * Ranked nearby wells with evidence summaries.
   */
  public async correlateWells(input: CorrelationInput): Promise<CorrelatedWell[]> {
    const {
      latitude, longitude, radiusKm, currentDepthFt,
      currentFormation, excludeWellId, limit = 5,
      depthToleranceFt = 500,
    } = input;

    // ── 1. Geographic candidates (Haversine in SQL) ─────────────────────────
    const distanceSql = sql<number>`(
      6371 * acos(
        cos(radians(${latitude})) * cos(radians(${wells.latitude})) *
        cos(radians(${wells.longitude}) - radians(${longitude})) +
        sin(radians(${latitude})) * sin(radians(${wells.latitude}))
      )
    )`;

    let candidatesQuery = db.select({
      id: wells.id,
      name: wells.name,
      status: wells.status,
      latitude: wells.latitude,
      longitude: wells.longitude,
      field_name: wells.field_name,
      block: wells.block,
      location_precision: wells.location_precision,
      distance_km: distanceSql,
    })
      .from(wells)
      .where(sql`${wells.latitude} IS NOT NULL AND ${wells.longitude} IS NOT NULL AND ${wells.id} != ${excludeWellId ?? ''}`)
      .having(sql`${distanceSql} <= ${radiusKm} + CASE WHEN ${wells.location_precision} = 'approximate' THEN ${APPROXIMATE_RADIUS_BUFFER_KM} ELSE 0 END`)
      .orderBy(distanceSql)
      .limit(limit * 3);

    const nearbyWells = await candidatesQuery;

    if (!nearbyWells.length) return [];

    const wellIds = nearbyWells.map((w) => w.id);

    // ── 2. Historical events for those wells (indexed queries) ──────────────
    const events = await db.select({
      id: operational_events.id,
      well_id: operational_events.well_id,
      event_type: operational_events.event_type,
      severity: operational_events.severity,
      start_depth_ft: operational_events.start_depth_ft,
      description: operational_events.description,
    })
      .from(operational_events)
      .where(inArray(operational_events.well_id, wellIds))
      .orderBy(desc(operational_events.occurred_at))
      .limit(500);

    // ── 3. Formation overlap: formations of nearby wells vs current formation ─
    const formations = await db.select({
      well_id: well_formations.well_id,
      formation_name: well_formations.formation_name,
    })
      .from(well_formations)
      .where(inArray(well_formations.well_id, wellIds));

    const formationsByWell = new Map<string, string[]>();
    for (const f of formations) {
      if (!f.well_id || !f.formation_name) continue;
      const list = formationsByWell.get(f.well_id) ?? [];
      list.push(String(f.formation_name).toLowerCase());
      formationsByWell.set(f.well_id, list);
    }
    const currentFormationLc = currentFormation?.toLowerCase() ?? null;

    // ── 4. Score each well ───────────────────────────────────────────────────
    const maxDistance = Math.max(...nearbyWells.map((w) => Number(w.distance_km)), 0.001);

    const scored: CorrelatedWell[] = nearbyWells.map((well) => {
      const wellEvents = events.filter((e) => e.well_id === well.id);
      const wellFormations = formationsByWell.get(well.id) ?? [];

      // Formation evidence: events whose description/known formation overlap.
      const formationOverlap = currentFormationLc
        ? wellFormations.filter((f) => f.includes(currentFormationLc) || currentFormationLc.includes(f))
        : [];

      const depthMatchEvents = currentDepthFt
        ? wellEvents.filter((e) => Math.abs(Number(e.start_depth_ft) - currentDepthFt) <= depthToleranceFt)
        : [];

      // Formation-match events: events from this well when the well has a
      // formation that overlaps with the active well's current formation.
      const formationMatchEvents = currentFormationLc && formationOverlap.length > 0
        ? wellEvents
        : [];

      const eventTypeCounts: Record<string, number> = {};
      for (const e of wellEvents) {
        if (!e.event_type) continue;
        eventTypeCounts[e.event_type] = (eventTypeCounts[e.event_type] ?? 0) + 1;
      }

      // ── Normalized sub-scores [0,1] ────────────────────────────────────────
      const distanceScore = 1 - Number(well.distance_km) / maxDistance;
      const discountedDistanceScore = well.location_precision === 'approximate'
        ? distanceScore * 0.5
        : distanceScore;

      const depthScore = currentDepthFt
        ? (depthMatchEvents.length > 0
          ? Math.min(1, depthMatchEvents.length / 3)
          : 0)
        : 0.5; // neutral when we don't know current depth

      const formationScore = currentFormationLc
        ? (formationOverlap.length > 0 ? 1 : 0)
        : 0.5;

      const eventScore = Math.min(1, wellEvents.length / 5);

      const relevanceScore =
        W_DISTANCE * discountedDistanceScore +
        W_DEPTH * depthScore +
        W_FORMATION * formationScore +
        W_EVENT_TYPES * eventScore;

      return {
        id: well.id,
        name: well.name,
        field_name: well.field_name ?? '',
        block: well.block,
        status: well.status ?? 'unknown',
        latitude: Number(well.latitude),
        longitude: Number(well.longitude),
        location_precision: well.location_precision,
        distance_km: Number(Number(well.distance_km).toFixed(3)),
        relevance_score: Number(relevanceScore.toFixed(4)),
        evidence: {
          formation_match_events: formationMatchEvents.slice(0, 5).map((e) => ({
            id: e.id, event_type: e.event_type ?? 'unknown', severity: e.severity ?? 'unknown',
            start_depth_ft: Number(e.start_depth_ft), description: e.description ?? '',
          })),
          depth_match_events: depthMatchEvents.slice(0, 5).map((e) => ({
            id: e.id, event_type: e.event_type ?? 'unknown', severity: e.severity ?? 'unknown',
            start_depth_ft: Number(e.start_depth_ft), description: e.description ?? '',
          })),
          event_type_counts: eventTypeCounts,
          total_events: wellEvents.length,
          formation_overlap: formationOverlap,
          location_precision: well.location_precision,
          distance_component: Number(distanceScore.toFixed(4)),
          discounted_distance_component: Number(discountedDistanceScore.toFixed(4)),
        },
      };
    });

    return scored
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit);
  }

  /**
   * Backwards-compatible thin wrapper: geographic-only nearby wells.
   * Prefer correlateWells() for intelligence features.
   */
  public async findNearbyWells(
    latitude: number,
    longitude: number,
    radiusKm: number = 50,
    limit: number = 5,
    excludeWellId?: string
  ): Promise<any[]> {
    const distanceSql = sql<number>`(
      6371 * acos(
        cos(radians(${latitude})) * cos(radians(${wells.latitude})) *
        cos(radians(${wells.longitude}) - radians(${longitude})) +
        sin(radians(${latitude})) * sin(radians(${wells.latitude}))
      )
    )`;

    const query = db.select({
      id: wells.id,
      name: wells.name,
      status: wells.status,
      latitude: wells.latitude,
      longitude: wells.longitude,
      location_precision: wells.location_precision,
      distance_km: distanceSql,
    })
      .from(wells)
      .where(sql`${wells.latitude} IS NOT NULL AND ${wells.longitude} IS NOT NULL ${excludeWellId ? sql`AND ${wells.id} != ${excludeWellId}` : sql``}`)
      .having(sql`${distanceSql} <= ${radiusKm} + CASE WHEN ${wells.location_precision} = 'approximate' THEN ${APPROXIMATE_RADIUS_BUFFER_KM} ELSE 0 END`)
      .orderBy(distanceSql)
      .limit(limit);

    const nearby = await query;
    return nearby;
  }
}

export const correlationService = new CorrelationService();
