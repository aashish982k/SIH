import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { intelligenceService } from '../services/intelligenceService';
import { query } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';

export async function getNearbyIntelligence(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const wellId = req.params.wellId;
    const { radiusKm } = req.query;

    // Fetch well coordinates
    const wells = await query('SELECT latitude, longitude FROM wells WHERE id = ?', [wellId]);
    if (!wells || (wells as any[]).length === 0) {
      sendError(res, 'Well not found', 404);
      return;
    }

    const well = (wells as any[])[0];
    if (well.latitude === null || well.longitude === null) {
      sendError(res, 'Well does not have coordinates configured', 400);
      return;
    }

    const radius = radiusKm ? parseFloat(radiusKm as string) : 50;

    const intelligence = await intelligenceService.getNearbyIntelligence(
      wellId,
      well.latitude,
      well.longitude,
      radius
    );
    
    sendSuccess(res, intelligence);
  } catch (err) {
    next(err);
  }
}
