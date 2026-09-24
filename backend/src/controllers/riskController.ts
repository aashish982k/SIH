import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { riskPredictionService, RiskPrediction } from '../services/riskPredictionService';
import { riskService } from '../services/riskService';
import { getWellById } from '../services/wellService';
import { riskFeatureService } from '../services/riskFeatureService';
import { sendSuccess, sendError } from '../utils/response';

/**
 * POST /api/risks/predict (implementation.md §10.1)
 * Accepts current well/drilling info, transforms it into ML features, and
 * returns the structured Random Forest prediction (or labeled fallback).
 */
export async function predictRisks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      wellId, well_id, depth, formation, rop, wob, rpm, torque,
      standpipe_pressure, pump_pressure, mud_weight, flow_rate,
      temperature, historical_hazards_in_radius,
    } = req.body as any;

    const id = wellId ?? well_id;
    let features: Record<string, any> = {
      well_id: id,
      depth, formation, rop, wob, rpm, torque,
      standpipe_pressure: standpipe_pressure ?? pump_pressure,
      mud_weight, flow_rate, temperature,
      historical_hazards_in_radius,
    };

    // If historical hazards weren't supplied, derive them from nearby-well
    // intelligence when the well exists and has coordinates.
    if (features.historical_hazards_in_radius === undefined && id) {
      try {
        const well = await getWellById(id);
        if (well?.latitude != null && well?.longitude != null) {
          const featureCtx = await riskFeatureService.extractFeatures(
            id, Number(well.latitude), Number(well.longitude), { depth }
          );
          features = { ...features, historical_hazards_in_radius: featureCtx.historical_hazards_in_radius };
        }
      } catch {
        // Intelligence is optional context — prediction proceeds without it.
      }
    }

    const prediction: RiskPrediction = await riskPredictionService.predictRisk(features);
    sendSuccess(res, { prediction });
  } catch (err) { next(err); }
}

/** GET /api/risks — paginated, filterable risk records. */
export async function listRisks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { well_id, risk_type, status, severity, page, limit } = req.query as any;
    const result = await riskService.listRisks({
      well_id, risk_type, status, severity,
      page: Number(page) || 1, limit: Math.min(Number(limit) || 20, 100),
    });
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

/** GET /api/risks/:id */
export async function getRisk(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const risk = await riskService.getRiskById(req.params.id);
    if (!risk) { sendError(res, 'Risk not found', 404); return; }
    sendSuccess(res, { risk });
  } catch (err) { next(err); }
}

/**
 * POST /api/risks/:id/resolve — mark a risk resolved/dismissed (engineer
 * decision; the system never acts autonomously, READEME §40).
 */
export async function resolveRisk(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.body as { status?: 'resolved' | 'dismissed' };
    const finalStatus = status === 'dismissed' ? 'dismissed' : 'resolved';
    const existing = await riskService.getRiskById(req.params.id);
    if (!existing) { sendError(res, 'Risk not found', 404); return; }

    await riskService.updateStatus(req.params.id, finalStatus);
    const risk = await riskService.getRiskById(req.params.id);
    sendSuccess(res, { risk }, `Risk ${finalStatus}`);
  } catch (err) { next(err); }
}

