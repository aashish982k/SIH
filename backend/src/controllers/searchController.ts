import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { knowledgeService } from '../services/knowledgeService';
import { sendSuccess } from '../utils/response';

export async function searchKnowledge(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { query, limit, well_id, event_type, formation, severity } = req.body;
    
    const results = await knowledgeService.searchKnowledge(
      query,
      limit,
      { well_id, event_type, formation, severity }
    );
    
    sendSuccess(res, { results, count: results.length });
  } catch (err) {
    next(err);
  }
}
