import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { hybridSearch } from '../services/searchService';
import { sendSuccess } from '../utils/response';

export async function searchKnowledge(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      query, limit, well_id, event_type, formation, severity,
      depth_min, depth_max, reranker, radius_km, latitude, longitude,
      hyde,
    } = req.body as {
      query: string;
      limit?: number;
      well_id?: string;
      event_type?: string;
      formation?: string;
      severity?: string;
      depth_min?: number;
      depth_max?: number;
      reranker?: boolean;
      radius_km?: number;
      latitude?: number;
      longitude?: number;
      hyde?: boolean;
    };

    const { results, telemetry } = await hybridSearch(
      query,
      { well_id, event_type, formation, severity, depth_min, depth_max, radius_km, latitude, longitude },
      { limit: limit ?? 10, reranker, hyde }
    );

    console.log(`[RAG Telemetry] Query: "${query}" | Results: ${results.length}`, JSON.stringify(telemetry));

    sendSuccess(res, { results, count: results.length, telemetry });
  } catch (err) {
    next(err);
  }
}
