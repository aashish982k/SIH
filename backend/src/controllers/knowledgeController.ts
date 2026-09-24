import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { hybridSearch } from '../services/searchService';
import { sendSuccess } from '../utils/response';

export async function getKnowledge(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = String(req.query.q ?? req.query.query ?? 'drilling incidents');
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const { results, telemetry } = await hybridSearch(query, {
      well_id: req.query.well_id as string | undefined,
      event_type: req.query.event_type as string | undefined,
      formation: req.query.formation as string | undefined,
      severity: req.query.severity as string | undefined,
    }, { limit, hyde: false, reranker: false });
    sendSuccess(res, { results, count: results.length, telemetry });
  } catch (err) { next(err); }
}
