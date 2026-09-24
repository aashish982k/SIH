import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db';
import { recommendations } from '../db/schema';
import { knowledgeService } from './knowledgeService';

export interface RecommendationOptions {
  riskId?: string | null;
  depth?: number | null;
  formation?: string | null;
  evidence?: Array<{ chunk_text?: string; well_name?: string; event_type?: string; depth_ft?: number }>;
}

export type RecommendationSource = typeof recommendations.$inferSelect.source;
export type RecommendationPriority = typeof recommendations.$inferSelect.priority;
export type RecommendationStatus = typeof recommendations.$inferSelect.status;

export class RecommendationService {
  /**
   * Generates actionable recommendations using RAG (Semantic Search).
   * Saves results to MySQL `recommendations` table using the correct schema columns.
   */
  public async generateRecommendations(
    riskType: string,
    wellId: string,
    options: RecommendationOptions = {}
  ): Promise<any[]> {
    if (!riskType || riskType === 'none') {
      return [];
    }

    const { riskId = null, depth = null, formation = null, evidence = [] } = options;

    // Use semantic search to find historical mitigations for this risk type
    const searchResults = await knowledgeService
      .searchKnowledge(`mitigation strategies for ${riskType.replace(/_/g, ' ')}`, 3)
      .catch(() => []);

    const createdRecommendations: any[] = [];

    // Build recommendations from search results
    for (const res of searchResults) {
      const id = uuidv4();

      let recText = `Historical insight for ${riskType.replace(/_/g, ' ')}: ${(res.chunk_text ?? '').substring(0, 200)}`;
      if (formation) recText += ` | Formation: ${formation}`;
      if (depth != null) recText += ` | Depth: ${depth.toFixed(0)} ft`;

      const rationale = res.well_name
        ? `From offset well: ${res.well_name}${res.event_type ? ` (event: ${res.event_type})` : ''}`
        : 'Derived from historical knowledge base';

      await db.insert(recommendations).values({
        id,
        well_id:        wellId,
        risk_id:        riskId,
        recommendation: recText,
        rationale,
        source:         'knowledge_base' as RecommendationSource,
        priority:       'high' as RecommendationPriority,
        status:         'pending' as RecommendationStatus,
      });

      createdRecommendations.push({
        id,
        well_id: wellId,
        risk_id: riskId,
        recommendation: recText,
        rationale,
        source: 'knowledge_base',
        priority: 'high',
        status: 'pending',
        created_at: new Date().toISOString(),
      });
    }

    // Append evidence-backed snippet if provided and search returned nothing
    if (createdRecommendations.length === 0 && evidence.length > 0) {
      const id = uuidv4();
      const top = evidence[0];
      const recText = `Based on nearby well data: ${(top.chunk_text ?? '').substring(0, 200)}`;
      const rationale = top.well_name ? `Offset well: ${top.well_name}` : 'Derived from nearby well intelligence';

      await db.insert(recommendations).values({
        id,
        well_id:        wellId,
        risk_id:        riskId,
        recommendation: recText,
        rationale,
        source:         'knowledge_base' as RecommendationSource,
        priority:       'high' as RecommendationPriority,
        status:         'pending' as RecommendationStatus,
      });

      createdRecommendations.push({
        id, well_id: wellId, risk_id: riskId,
        recommendation: recText, rationale,
        source: 'knowledge_base', priority: 'high', status: 'pending',
        created_at: new Date().toISOString(),
      });
    }

    // Fallback rule-based recommendation when no historical data is available
    if (createdRecommendations.length === 0) {
      const id = uuidv4();
      const fallbackMap: Record<string, string> = {
        STUCK_PIPE:       'Work pipe immediately. Increase flow rate and rotate if possible. Spot lubricant pill. Monitor overpull.',
        MUD_LOSS:         'Pump LCM pill and reduce pump pressure. Monitor pit volume. Consider reducing ECD.',
        KICK:             'Close BOP, monitor SIDP/SICP. Increase mud weight per well control procedure.',
        OVERPRESSURE:     'Increase mud weight and monitor flow out. Activate well control protocol if required.',
        TORQUE_SPIKE:     'Reduce WOB and RPM. Ream back to bottom. Check for formation change.',
        CEMENTING_ISSUE:  'Evaluate CBIL log. Plan remedial squeeze if top of cement is inadequate.',
        CASING_ISSUE:     'Halt drilling and assess casing integrity. Run caliper if required.',
        WELL_CONTROL:     'Shut in well. Activate emergency well control procedure. Notify company man.',
      };
      const normalised = riskType.toUpperCase().replace(/\s+/g, '_');
      let recText = fallbackMap[normalised] ?? 'Halt operations and review sensor data with the drilling engineer.';
      if (formation) recText += ` | Formation: ${formation}`;
      if (depth != null) recText += ` | Depth: ${depth.toFixed(0)} ft`;

      await db.insert(recommendations).values({
        id,
        well_id:        wellId,
        risk_id:        riskId,
        recommendation: recText,
        rationale:      'Rule-based fallback — no historical data found',
        source:         'rule_engine' as RecommendationSource,
        priority:       'high' as RecommendationPriority,
        status:         'pending' as RecommendationStatus,
      });

      createdRecommendations.push({
        id, well_id: wellId, risk_id: riskId,
        recommendation: recText,
        rationale: 'Rule-based fallback — no historical data found',
        source: 'rule_engine', priority: 'high', status: 'pending',
        created_at: new Date().toISOString(),
      });
    }

    return createdRecommendations;
  }

  public async getRecommendations(wellId: string): Promise<any[]> {
    return await db.select()
      .from(recommendations)
      .where(eq(recommendations.well_id, wellId))
      .orderBy(desc(recommendations.created_at))
      .limit(20);
  }
}

export const recommendationService = new RecommendationService();
