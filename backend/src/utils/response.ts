import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Operation successful',
  status = 200
): void {
  res.status(status).json({ success: true, message, data } satisfies ApiResponse<T>);
}

export function sendError(
  res: Response,
  message: string,
  status = 500,
  error?: any
): void {
  res.status(status).json({ success: false, message, error } satisfies ApiResponse);
}
