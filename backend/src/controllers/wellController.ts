import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as wellService from '../services/wellService';
import { sendSuccess, sendError } from '../utils/response';

export async function listWells(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, field, page, limit } = req.query as any;
    const result = await wellService.listWells({ status, field, page: +page, limit: +limit });
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function getWell(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const well = await wellService.getWellById(req.params.id);
    if (!well) { sendError(res, 'Well not found', 404); return; }
    sendSuccess(res, { well });
  } catch (err) { next(err); }
}

export async function getNearbyWells(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { latitude, longitude, radius } = req.query as any;
    const wells = await wellService.getNearbyWells(+latitude, +longitude, +radius);
    sendSuccess(res, { wells, count: wells.length });
  } catch (err) { next(err); }
}

export async function getGlobalWellStats(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, { stats: await wellService.getGlobalWellStats() });
  } catch (err) { next(err); }
}

export async function createWell(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const well = await wellService.createWell(req.body);
    sendSuccess(res, { well }, 'Well created', 201);
  } catch (err) { next(err); }
}

export async function updateWell(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const well = await wellService.updateWell(req.params.id, req.body);
    sendSuccess(res, { well }, 'Well updated');
  } catch (err) { next(err); }
}

export async function deleteWell(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await wellService.deleteWell(req.params.id);
    sendSuccess(res, null, 'Well deleted');
  } catch (err) { next(err); }
}
