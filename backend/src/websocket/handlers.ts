import { Server, Socket } from 'socket.io';
import { WS_EVENTS } from './events';
import { riskFeatureService } from '../services/riskFeatureService';
import { riskPredictionService } from '../services/riskPredictionService';
import { riskService } from '../services/riskService';
import { recommendationService } from '../services/recommendationService';
import { alertService } from '../services/alertService';

const lastPipelineRun = new Map<string, number>();
const DEBOUNCE_MS = Number(process.env.WS_PIPELINE_DEBOUNCE_MS ?? 15_000);

/**
 * Register all socket event handlers for an authenticated connection.
 * Part 1: establishes infrastructure — join/leave well rooms, echo events.
 * Part 2: will implement full risk detection + broadcast logic.
 */
export function registerHandlers(io: Server, socket: Socket): void {
  const user = socket.data.user;
  console.log(`[WS] Connected: ${user.email} (${socket.id})`);

  // ── Join a well-specific room ─────────────────────────────────
  socket.on(WS_EVENTS.JOIN_WELL, (wellId: string) => {
    if (!wellId || typeof wellId !== 'string') return;
    socket.join(`well:${wellId}`);
    console.log(`[WS] ${user.email} joined room well:${wellId}`);
    socket.emit('well:joined', { wellId, message: `Subscribed to updates for well ${wellId}` });
  });

  // ── Leave a well room ─────────────────────────────────────────
  socket.on(WS_EVENTS.LEAVE_WELL, (wellId: string) => {
    socket.leave(`well:${wellId}`);
    console.log(`[WS] ${user.email} left room well:${wellId}`);
  });

  // ── Drilling update (Part 2: triggers risk analysis) ──────────
  socket.on(WS_EVENTS.DRILLING_UPDATE, async (data: any) => {
    console.log(`[WS] drilling:update from ${user.email}:`, data);
    if (!data?.well_id) return;

    // 1. Echo the raw drilling data to the well room
    io.to(`well:${data.well_id}`).emit(WS_EVENTS.DRILLING_UPDATE, {
      ...data,
      timestamp: new Date().toISOString(),
      source: 'ertmac',
    });

    try {
      // 2. Extract features
      // Assuming coordinates might not be provided directly in WS, we'll use defaults or query DB if needed.
      // For now, assume data contains lat/lon or we just use 0,0 for stub.
      const features = await riskFeatureService.extractFeatures(
        data.well_id, 
        data.latitude || 0, 
        data.longitude || 0, 
        data
      );

      // Debounce check (15s)
      const now = Date.now();
      const lastRun = lastPipelineRun.get(data.well_id) ?? 0;
      if (now - lastRun < DEBOUNCE_MS) return;
      lastPipelineRun.set(data.well_id, now);

      // 3. Predict risk
      const prediction = await riskPredictionService.predictRisk(features);

      // 4. Persist risks + generate alert/recommendations when a dangerous
      // risk crosses the high threshold (READEME §31-32).
      const top = prediction.top_risk;
      if (top && top.type !== 'normal' && top.probability > 0.7) {
        const { risk, created } = await riskService.createRisk({
          wellId: data.well_id,
          riskType: top.type,
          probability: top.probability,
          depthFt: features?.current_depth ?? data?.depth ?? null,
          message: `High risk of ${top.type} detected (score: ${top.probability})`,
          source: prediction.source === 'rag_llm' ? 'rag_llm' : 'ml_model',
          confidence: 0.82,
          reasoning: prediction.reasoning,
          evidence: prediction.evidence,
          recommendation: prediction.recommendation,
        });
        broadcastRisk(io, data.well_id, risk, created ? WS_EVENTS.RISK_DETECTED : WS_EVENTS.RISK_UPDATED);

        const evidence = prediction.evidence ?? [];

        // Step 5 — Persist alert to MySQL
        const alertId = await alertService.createAlert({
          wellId: data.well_id,
          riskId: risk?.id ?? null,
          alertType: top.type,
          severity: top.severity.toLowerCase() as 'low'|'medium'|'high'|'critical',
          payload: {
            depth: features?.current_depth ?? null,
            formation: features?.formation ?? null,
            probability: top.probability,
            modelVersion: prediction.model_version,
            evidence: evidence.slice(0, 3).map((e: any) => ({
              chunk_text: e.chunk_text?.substring(0, 200),
              well_name: e.well_name,
              event_type: e.event_type,
              depth_ft: e.depth_ft,
            })),
          },
        });

        // Step 6 — Emit alert:new
        io.to(`well:${data.well_id}`).emit(WS_EVENTS.ALERT_NEW, {
          id: alertId,
          wellId: data.well_id,
          depth: features?.current_depth ?? null,
          riskType: top.type,
          probability: top.probability,
          severity: top.severity,
          formation: features?.formation ?? null,
          modelVersion: prediction.model_version,
          historicalEvidence: evidence.slice(0, 3),
          timestamp: new Date().toISOString(),
        });

        const recs = await recommendationService.generateRecommendations(top.type, data.well_id, {
          riskId: risk?.id ?? null,
          depth: features?.current_depth ?? null,
          formation: features?.formation ?? null,
          evidence: evidence.slice(0, 3).map((e: any) => ({
            chunk_text: e.chunk_text,
            well_name: e.well_name,
            event_type: e.event_type,
            depth_ft: e.depth_ft
          }))
        });
        recs.forEach(rec => broadcastRecommendation(io, data.well_id, rec));
      }
    } catch (err) {
      console.error('[WS] Risk Pipeline Error:', err);
    }
  });

  // ── Disconnect ────────────────────────────────────────────────
  socket.on(WS_EVENTS.DISCONNECT, (reason: string) => {
    console.log(`[WS] Disconnected: ${user.email} — ${reason}`);
  });
}

// ── Server-side broadcast helpers ─────────────────────────────

/**
 * Broadcast a risk record (detected or updated) to a well room.
 */
export function broadcastRisk(
  io: Server,
  wellId: string,
  risk: any,
  event: typeof WS_EVENTS.RISK_DETECTED | typeof WS_EVENTS.RISK_UPDATED = WS_EVENTS.RISK_DETECTED
): void {
  io.to(`well:${wellId}`).emit(event, risk);
}

/**
 * Broadcast knowledge search results to a well room (knowledge:result).
 */
export function broadcastKnowledgeResult(io: Server, wellId: string, payload: any): void {
  io.to(`well:${wellId}`).emit(WS_EVENTS.KNOWLEDGE_RESULT, payload);
}

/**
 * Broadcast a recommendation to all clients subscribed to a well room.
 */
export function broadcastRecommendation(io: Server, wellId: string, recommendation: any): void {
  io.to(`well:${wellId}`).emit(WS_EVENTS.RECOMMENDATION_NEW, recommendation);
}
