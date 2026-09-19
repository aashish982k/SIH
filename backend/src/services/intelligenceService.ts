import { correlationService } from './correlationService';
import { knowledgeService } from './knowledgeService';

export class IntelligenceService {
  /**
   * Retrieves insights for a specific well by looking at nearby wells and searching their knowledge base.
   */
  public async getNearbyIntelligence(
    wellId: string,
    latitude: number,
    longitude: number,
    radiusKm: number = 50
  ): Promise<any> {
    
    // 1. Find nearby wells
    const nearbyWells = await correlationService.findNearbyWells(latitude, longitude, radiusKm, 5, wellId);

    if (nearbyWells.length === 0) {
      return { nearbyWells: [], insights: [] };
    }

    // 2. Extract recent risks/events from those wells using Semantic Search (or standard DB query)
    // We'll use standard DB query to get historical events for these wells for concrete data,
    // and semantic search to find unstructured risks.

    const nearbyWellIds = nearbyWells.map(w => w.id);
    
    // Search unstructured knowledge chunks for these well IDs that contain risk keywords
    const insightsPromises = nearbyWellIds.map(id => 
      knowledgeService.searchKnowledge('mud loss kick stuck pipe overpressure hazard risk', 3, { well_id: id })
    );

    const insightsResults = await Promise.all(insightsPromises);
    
    // Flatten insights
    const allInsights = insightsResults.flat().filter(Boolean);
    
    // Group insights by well
    const insightsByWell = nearbyWells.map(well => {
       const wellInsights = allInsights.filter((i: any) => i.well_id === well.id);
       return {
         ...well,
         historical_insights: wellInsights
       };
    });

    return {
      nearbyWells: insightsByWell
    };
  }
}

export const intelligenceService = new IntelligenceService();
