import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as authService from '../services/authService';
import { sendSuccess, sendError } from '../utils/response';

export async function register(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password, role } = req.body;
    const result = await authService.register(name, email, password, role);
    sendSuccess(res, result, 'Registration successful', 201);
  } catch (err) { next(err); }
}

export async function login(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, username, password } = req.body;
    const result = await authService.login(email ?? username, password);
    sendSuccess(res, result, 'Login successful');
  } catch (err) { next(err); }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.getMe(req.user!.id);
    sendSuccess(res, { user });
  } catch (err) { next(err); }
}
