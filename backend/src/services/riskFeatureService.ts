import { intelligenceService } from './intelligenceService';
import { env } from '../config/env';

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
    
    // 1. Get intelligence from nearby wells (combined correlation)
    const intelligence = await intelligenceService.getNearbyIntelligence(
      wellId, latitude, longitude, 50,
      realTimeParameters?.depth ?? undefined
    );

    // 2. Count historical hazards
    let historicalHazardsCount = 0;
    if (intelligence && intelligence.nearbyWells) {
       for (const well of intelligence.nearbyWells) {
         if (well.historical_insights && well.historical_insights.length > 0) {
           historicalHazardsCount += well.historical_insights.length;
         }
       }
    }

    // 3. Prepare the feature structure (Python field names via features.py map)
    const params = realTimeParameters || {};
    return {
      wellId,
      timestamp: new Date().toISOString(),
      current_depth:  params.depth_ft   ?? params.depth   ?? 0,
      tvd:            params.tvd_ft     ?? 0,
      rop:            params.rop_ft_per_hr ?? params.rop  ?? 0,
      wob:            params.wob_klbs   ?? params.wob     ?? 0,
      rpm:            params.rpm        ?? 0,
      torque:         params.torque_kft_lbs ?? params.torque ?? 0,
      standpipe_pressure: params.spp_psi ?? params.pump_pressure ?? 0,
      mud_weight:     params.mud_weight_ppg ?? params.mud_weight ?? 0,
      flow_rate:      params.flow_rate_gpm  ?? params.flow_rate  ?? 0,
      temperature:    params.temperature_f  ?? params.temperature ?? 0,
      formation:      params.formation ?? null,
      historical_hazards_in_radius: historicalHazardsCount,
      context: intelligence,
    };
  }
}

export const riskFeatureService = new RiskFeatureService();
