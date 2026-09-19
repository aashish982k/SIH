import { Server, Socket } from 'socket.io';
import { WS_EVENTS } from './events';
import { riskFeatureService } from '../services/riskFeatureService';
import { riskPredictionService } from '../services/riskPredictionService';
import { alertService } from '../services/alertService';
import { recommendationService } from '../services/recommendationService';

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

      // 3. Predict risk
      const prediction = await riskPredictionService.predictRisk(features);

      // 4. If high risk, generate alert & recommendations
      if (prediction.risk_score > 0.7) {
        const alert = await alertService.createAlert(
          data.well_id,
          prediction.risk_type,
          `High risk of ${prediction.risk_type} detected (score: ${prediction.risk_score})`,
          prediction.risk_score > 0.8 ? 'critical' : 'warning'
        );
        broadcastAlert(io, data.well_id, alert);

        const recs = await recommendationService.generateRecommendations(prediction.risk_type, data.well_id);
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
 * Broadcast a new alert to all clients subscribed to a well room.
 * Part 2 will call this from the risk engine.
 */
export function broadcastAlert(io: Server, wellId: string, alert: any): void {
  io.to(`well:${wellId}`).emit(WS_EVENTS.ALERT_NEW, alert);
}

/**
 * Broadcast a recommendation to all clients subscribed to a well room.
 */
export function broadcastRecommendation(io: Server, wellId: string, recommendation: any): void {
  io.to(`well:${wellId}`).emit(WS_EVENTS.RECOMMENDATION_NEW, recommendation);
}
