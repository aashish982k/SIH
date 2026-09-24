import { eq, desc, and, isNull, lte } from 'drizzle-orm';
import { correlationService } from './correlationService';
import { knowledgeService } from './knowledgeService';
import { db } from '../db';
import { wells, well_formations, drilling_parameters, operational_events, risks, recommendations } from '../db/schema';

export class IntelligenceService {
  /**
   * Nearby-well intelligence using combined correlation
   * (geo + depth + formation + event similarity, READEME §16).
   */
  public async getNearbyIntelligence(
    wellId: string,
    latitude: number,
    longitude: number,
    radiusKm: number = 50,
    currentDepthFt?: number,
    currentFormation?: string | null
  ): Promise<any> {
    const nearbyWells = await correlationService.correlateWells({
      latitude,
      longitude,
      radiusKm,
      excludeWellId: wellId,
      limit: 5,
      currentDepthFt,
      currentFormation,
    });

    if (nearbyWells.length === 0) {
      return { nearbyWells: [], insights: [] };
    }

    // Semantic knowledge search per nearby well for unstructured insights.
    const insightsPromises = nearbyWells.map((well) =>
      knowledgeService
        .searchKnowledge('mud loss kick stuck pipe overpressure hazard risk', 3, { well_id: well.id })
        .catch(() => [])
    );
    const insightsResults = await Promise.all(insightsPromises);
    const allInsights = insightsResults.flat().filter(Boolean);

    const insightsByWell = nearbyWells.map((well) => ({
      ...well,
      historical_insights: allInsights.filter((i: any) => i.well_id === well.id),
    }));

    return { nearbyWells: insightsByWell };
  }

  /**
   * Combined intelligence for one well (implementation.md §10.2 / READEME §36):
   * well profile + current formation + historical events + nearby-well
   * intelligence + latest ML risks + recommendations.
   */
  public async getWellIntelligence(wellId: string, radiusKm = 50): Promise<any> {
    const [well] = await db.select().from(wells).where(eq(wells.id, wellId)).limit(1);
    if (!well) return null;

    // Current depth
    const [currentDepthRow] = await db.select({ depth_ft: drilling_parameters.depth_ft })
      .from(drilling_parameters)
      .where(eq(drilling_parameters.well_id, wellId))
      .orderBy(desc(drilling_parameters.recorded_at))
      .limit(1);
    const currentDepthFt = currentDepthRow ? Number(currentDepthRow.depth_ft) : undefined;

    // Current formation from the active depth.
    let currentFormationRow = null;
    if (currentDepthFt !== undefined) {
      const [f] = await db.select({
        formation_name: well_formations.formation_name,
        top_depth_ft: well_formations.top_depth_ft,
        bottom_depth_ft: well_formations.bottom_depth_ft,
        lithology: well_formations.lithology,
        pore_pressure_psi: well_formations.pore_pressure_psi
      })
      .from(well_formations)
      .where(
        and(
          eq(well_formations.well_id, wellId),
          lte(well_formations.top_depth_ft, String(currentDepthFt))
        )
      )
      .orderBy(desc(well_formations.top_depth_ft))
      .limit(1);
      
      currentFormationRow = f ?? null;
    }

    // Historical events for this well.
    const historicalEvents = await db.select({
      id: operational_events.id,
      event_type: operational_events.event_type,
      severity: operational_events.severity,
      start_depth_ft: operational_events.start_depth_ft,
      end_depth_ft: operational_events.end_depth_ft,
      description: operational_events.description,
      mitigation: operational_events.mitigation,
      lessons_learned: operational_events.lessons_learned,
      occurred_at: operational_events.occurred_at,
      duration_hours: operational_events.duration_hours,
      npt_hours: operational_events.npt_hours,
    })
      .from(operational_events)
      .where(eq(operational_events.well_id, wellId))
      .orderBy(desc(operational_events.occurred_at))
      .limit(25);

    // Latest ML/persisted risks.
    const predictedRisks = await db.select({
      id: risks.id,
      risk_type: risks.risk_type,
      severity: risks.severity,
      probability: risks.probability,
      depth_ft: risks.depth_ft,
      message: risks.message,
      status: risks.status,
      created_at: risks.created_at,
    })
      .from(risks)
      .where(and(eq(risks.well_id, wellId), eq(risks.status, 'active')))
      .orderBy(desc(risks.created_at))
      .limit(10);

    // Latest recommendations.
    const recommendationsList = await db.select({
      id: recommendations.id,
      recommendation: recommendations.recommendation,
      source: recommendations.source,
      priority: recommendations.priority,
      status: recommendations.status,
      created_at: recommendations.created_at,
    })
      .from(recommendations)
      .where(eq(recommendations.well_id, wellId))
      .orderBy(desc(recommendations.created_at))
      .limit(10);

    // Nearby-well intelligence with combined correlation.
    const nearby = await this.getNearbyIntelligence(
      wellId,
      Number(well.latitude),
      Number(well.longitude),
      radiusKm,
      currentDepthFt,
      currentFormationRow ? currentFormationRow.formation_name : null
    );

    return {
      well,
      currentFormation: currentFormationRow ?? null,
      currentDepthFt: currentDepthFt ?? null,
      historicalEvents,
      predictedRisks,
      nearbyWells: nearby.nearbyWells,
      recommendations: recommendationsList,
    };
  }
}

export const intelligenceService = new IntelligenceService();
