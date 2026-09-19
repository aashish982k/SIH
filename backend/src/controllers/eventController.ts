import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as eventService from '../services/eventService';
import { sendSuccess, sendError } from '../utils/response';

export async function listEvents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await eventService.listEvents(req.query as any);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function getEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const event = await eventService.getEventById(req.params.id);
    if (!event) { sendError(res, 'Event not found', 404); return; }
    sendSuccess(res, { event });
  } catch (err) { next(err); }
}

export async function createEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const event = await eventService.createEvent(req.body);
    sendSuccess(res, { event }, 'Event created', 201);
  } catch (err) { next(err); }
}
