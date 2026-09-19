import { query } from '../config/db';
import { knowledgeService } from './knowledgeService';

export class RecommendationService {
  /**
   * Generates actionable recommendations using RAG (Semantic Search).
   * Takes the risk type and searches historical knowledge for mitigations.
   */
  public async generateRecommendations(riskType: string, wellId: string): Promise<any[]> {
    if (riskType === 'none') {
      return [];
    }

    // Use Semantic Search to find past mitigations for this risk type
    const searchResults = await knowledgeService.searchKnowledge(
      `mitigation strategies for ${riskType}`,
      3
    );

    const recommendations: any[] = [];

    // Synthesize recommendations (in the future, an LLM could summarize this)
    // For now, we extract the raw chunk texts as recommendations and save them to DB
    for (const res of searchResults) {
       const recText = `Historical insight: ${res.chunk_text.substring(0, 200)}...`;
       
       // Save to DB
       const sql = `
         INSERT INTO recommendations (well_id, recommendation_text, source_document_id)
         VALUES (?, ?, ?)
       `;
       const result: any = await query(sql, [wellId, recText, res.document_id || null]);

       recommendations.push({
         id: result.insertId,
         well_id: wellId,
         recommendation_text: recText,
         created_at: new Date()
       });
    }

    // Fallback rule-based if semantic search returns nothing
    if (recommendations.length === 0) {
       let fallback = '';
       if (riskType === 'Overpressure') fallback = 'Increase mud weight and monitor flow out.';
       else if (riskType === 'Mud Loss') fallback = 'Pump LCM pills and reduce pump pressure.';
       else fallback = 'Halt operations and review sensor data.';

       const sql = `
         INSERT INTO recommendations (well_id, recommendation_text)
         VALUES (?, ?)
       `;
       const result: any = await query(sql, [wellId, fallback]);
       recommendations.push({
         id: result.insertId,
         well_id: wellId,
         recommendation_text: fallback,
         created_at: new Date()
       });
    }

    return recommendations;
  }

  public async getRecommendations(wellId: string): Promise<any[]> {
    const sql = `SELECT * FROM recommendations WHERE well_id = ? ORDER BY created_at DESC LIMIT 10`;
    return (await query(sql, [wellId])) as any[];
  }
}

export const recommendationService = new RecommendationService();
