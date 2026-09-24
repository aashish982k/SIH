import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { intelligenceService } from '../services/intelligenceService';
import { sendSuccess, sendError } from '../utils/response';

/**
 * GET /api/intelligence/wells/:wellId (implementation.md §10.2)
 * Combined context: well profile, current formation, historical events,
 * nearby correlated wells, persisted risks, recommendations.
 */
export async function getWellIntelligence(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const wellId = req.params.wellId;
    const radiusKm = req.query.radiusKm ? parseFloat(req.query.radiusKm as string) : 50;

    const intelligence = await intelligenceService.getWellIntelligence(wellId, radiusKm);
    if (!intelligence) {
      sendError(res, 'Well not found', 404);
      return;
    }

    sendSuccess(res, intelligence);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/intelligence/wells/:wellId/nearby — nearby-well intelligence only
 * (lighter payload for the map view).
 */
export async function getNearbyIntelligence(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const wellId = req.params.wellId;
    const { radiusKm } = req.query;

    const wells = await intelligenceService.getWellIntelligence(wellId, radiusKm ? parseFloat(radiusKm as string) : 50);
    if (!wells) {
      sendError(res, 'Well not found', 404);
      return;
    }

    sendSuccess(res, { nearbyWells: wells.nearbyWells });
  } catch (err) {
    next(err);
  }
}
