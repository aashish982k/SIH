import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { recommendationService } from '../services/recommendationService';
import { sendSuccess } from '../utils/response';

export async function getRecommendations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const wellId = req.params.wellId;
    const recommendations = await recommendationService.getRecommendations(wellId);
    
    sendSuccess(res, { recommendations });
  } catch (err) {
    next(err);
  }
}
