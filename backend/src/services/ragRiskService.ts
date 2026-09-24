import { z } from 'zod';
import { env } from '../config/env';
import { hybridSearch } from './searchService';

const evidenceSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1).max(2000),
  well: z.string().optional(),
  event_type: z.string().optional(),
  depth_ft: z.number().optional(),
  score: z.number().optional(),
});

const riskTypeSchema = z.enum([
  'mud_loss', 'stuck_pipe', 'kick', 'overpressure', 'torque_spike',
  'cementing_issue', 'casing_issue', 'well_control', 'other',
]);

const llmRiskSchema = z.object({
  risks: z.array(z.object({
    type: riskTypeSchema,
    probability: z.number().min(0).max(1),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
  })).min(1),
  top_risk: z.object({
    type: riskTypeSchema,
    probability: z.number().min(0).max(1),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
  }),
  reasoning: z.string().min(1).max(4000),
  recommendation: z.string().min(1).max(2000),
  evidence: z.array(evidenceSchema).max(12).default([]),
});

export type RagRiskResult = z.infer<typeof llmRiskSchema>;

function heuristic(features: any): RagRiskResult {
  const pressure = Number(features?.pump_pressure ?? features?.standpipe_pressure ?? 0);
  const hazards = Number(features?.historical_hazards_in_radius ?? 0);
  const type = pressure > 5000 ? 'overpressure' : pressure > 0 && pressure < 1000
    ? 'mud_loss' : hazards > 2 ? 'well_control' : 'other';
  const probability = pressure > 5000 ? 0.85 : pressure > 0 && pressure < 1000
    ? 0.75 : hazards > 2 ? 0.6 : 0.1;
  const severity = probability >= 0.8 ? 'critical' : probability >= 0.7
    ? 'high' : probability >= 0.4 ? 'medium' : 'low';
  return {
    risks: [{ type, probability, severity }],
    top_risk: { type, probability, severity },
    reasoning: 'The language model was unavailable; this result uses a transparent pressure and historical-hazard heuristic.',
    recommendation: probability >= 0.4
      ? 'Review drilling parameters and confirm the appropriate well-control response with the drilling engineer.'
      : 'Continue monitoring drilling parameters and investigate any deviation from the current trend.',
    evidence: [],
  };
}

export async function predictRiskWithRag(features: Record<string, any>): Promise<RagRiskResult & {
  source: 'rag_llm' | 'fallback_stub';
  model: string;
  model_version: string;
}> {
  const query = [
    'drilling risk assessment and mitigation',
    features.formation ? `formation ${features.formation}` : '',
    features.depth != null ? `depth ${features.depth} ft` : '',
    features.pump_pressure != null ? `pump pressure ${features.pump_pressure}` : '',
  ].filter(Boolean).join(' ');

  try {
    const search = await hybridSearch(query, {
      well_id: features.well_id,
      formation: features.formation,
      depth_min: features.depth != null ? Number(features.depth) - env.DEPTH_TOLERANCE_FT : undefined,
      depth_max: features.depth != null ? Number(features.depth) + env.DEPTH_TOLERANCE_FT : undefined,
    }, { limit: env.RAG_RISK_TOP_K, reranker: true });

    const evidence = search.results.map((item: any) => ({
      id: item.id != null ? String(item.id) : undefined,
      text: String(item.chunk_text ?? '').slice(0, 2000),
      well: item.well_name ?? undefined,
      event_type: item.event_type ?? undefined,
      depth_ft: item.depth_ft != null ? Number(item.depth_ft) : undefined,
      score: typeof item.score === 'number' ? item.score : undefined,
    })).filter((item) => item.text.length > 0);

    if (!env.GROK_API_KEY) throw new Error('GROK_API_KEY is not configured');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.ML_SERVICE_TIMEOUT_MS);
    try {
      const response = await fetch(`${env.GROK_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.GROK_API_KEY}`,
        },
        body: JSON.stringify({
          model: env.GROK_MODEL,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [{
            role: 'system',
            content: 'You assess drilling risk. Return only valid json matching the requested schema. Never invent evidence; use only supplied evidence. This is decision support, not an autonomous action.',
          }, {
            role: 'user',
            content: JSON.stringify({
              task: 'Assess current drilling risk and provide concise reasoning and a safe recommendation. The response must be json only.',
              features,
              evidence,
              output_schema: {
                risks: [{ type: 'mud_loss|stuck_pipe|kick|overpressure|torque_spike|cementing_issue|casing_issue|well_control|other', probability: 'number 0..1', severity: 'low|medium|high|critical' }],
                top_risk: { type: 'same allowed type', probability: 'number 0..1', severity: 'low|medium|high|critical' },
                reasoning: 'string',
                recommendation: 'string',
                evidence: 'array of supplied evidence items only',
              },
            }),
          }],
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Grok responded ${response.status}`);
      const payload = await response.json() as any;
      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error('Grok returned no message');
      const parsed = llmRiskSchema.parse(JSON.parse(content));
      // Evidence is always the server-side retrieval result, never free-form
      // model output, so the UI cannot present fabricated citations.
      return {
        ...parsed,
        evidence,
        source: 'rag_llm',
        model: env.GROK_MODEL,
        model_version: 'grok-rag-v1',
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    console.warn('[RAG] Risk assessment fallback:', err instanceof Error ? err.message : 'unknown error');
    const fallback = heuristic(features);
    return { ...fallback, source: 'fallback_stub', model: 'heuristic_stub', model_version: 'stub-v2' };
  }
}
