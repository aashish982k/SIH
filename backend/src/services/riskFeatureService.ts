import { intelligenceService } from './intelligenceService';

export class RiskFeatureService {
  /**
   * Prepares the feature vector and context for the ML model (or stub).
   * Aggregates real-time sensor data and nearby intelligence.
   */
  public async extractFeatures(
    wellId: string, 
    latitude: number, 
    longitude: number,
    realTimeParameters: any
  ): Promise<any> {
    
    // 1. Get intelligence from nearby wells
    const intelligence = await intelligenceService.getNearbyIntelligence(wellId, latitude, longitude, 50);

    // 2. Count historical hazards
    let historicalHazardsCount = 0;
    if (intelligence && intelligence.nearbyWells) {
       for (const well of intelligence.nearbyWells) {
         if (well.historical_insights && well.historical_insights.length > 0) {
           historicalHazardsCount += well.historical_insights.length;
         }
       }
    }

    // 3. Prepare the feature structure
    return {
      wellId,
      timestamp: new Date().toISOString(),
      current_depth: realTimeParameters.depth || 0,
      wob: realTimeParameters.wob || 0,
      rop: realTimeParameters.rop || 0,
      flow_rate: realTimeParameters.flow_rate || 0,
      pump_pressure: realTimeParameters.pump_pressure || 0,
      historical_hazards_in_radius: historicalHazardsCount,
      // Pass the raw insights text to the ML model if needed
      context: intelligence
    };
  }
}

export const riskFeatureService = new RiskFeatureService();
