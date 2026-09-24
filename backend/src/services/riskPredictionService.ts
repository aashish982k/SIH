/**
 * Risk prediction service — hides the ML implementation from the rest of the
 * backend. Risk scoring uses retrieved knowledge plus Grok; Python remains
 * available to the retrieval pipeline for OCR/reranking.
 */

import { predictRiskWithRag, RagRiskResult } from './ragRiskService';

export interface RiskPrediction {
  prediction_id: string;
  timestamp: string;
  risks: Array<{ type: string; probability: number; severity: string }>;
  top_risk: { type: string; probability: number; severity: string };
  model: string;
  model_version: string;
  source: 'rag_llm' | 'fallback_stub';
  reasoning?: string;
  recommendation?: string;
  evidence?: RagRiskResult['evidence'];
}

export class RiskPredictionService {
  public async predictRisk(features: any): Promise<RiskPrediction> {
    const data = await predictRiskWithRag(features);
    return {
      prediction_id: `pred_${Date.now()}`,
      timestamp: new Date().toISOString(),
      risks: data.risks,
      top_risk: data.top_risk,
      model: data.model,
      model_version: data.model_version,
      source: data.source,
      reasoning: data.reasoning,
      recommendation: data.recommendation,
      evidence: data.evidence,
    };
  }
}

export const riskPredictionService = new RiskPredictionService();
