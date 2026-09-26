import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { knowledgeService } from '../services/knowledgeService';
import { sendSuccess } from '../utils/response';

export async function searchKnowledge(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      query, limit, well_id, event_type, formation, severity,
      status, location, field, date_from, date_to, latitude, longitude, radius_km
    } = req.body;
    
    const results = await knowledgeService.searchKnowledge(
      query || '',
      limit || 25,
      {
        well_id, event_type, formation, severity, status,
        location: location || field, date_from, date_to,
        latitude, longitude, radius_km
      }
    );
    
    sendSuccess(res, { results, count: results.length });
  } catch (err) {
    next(err);
  }
}
