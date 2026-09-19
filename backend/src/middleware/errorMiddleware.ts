import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';

export function errorMiddleware(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation error
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      error: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  // MySQL duplicate entry
  if (err.code === 'ER_DUP_ENTRY') {
    res.status(409).json({
      success: false,
      message: 'A record with that value already exists',
      error: env.NODE_ENV === 'development' ? err.message : undefined,
    });
    return;
  }

  // MySQL foreign key constraint
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    res.status(400).json({
      success: false,
      message: 'Referenced record does not exist',
      error: env.NODE_ENV === 'development' ? err.message : undefined,
    });
    return;
  }

  // Default 500
  const statusCode: number = err.statusCode ?? err.status ?? 500;
  const message: string = err.message ?? 'Internal server error';

  console.error(`[ERROR] ${statusCode} — ${message}`, err.stack ?? '');

  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 && env.NODE_ENV === 'production' ? 'Internal server error' : message,
    error: env.NODE_ENV === 'development' ? { stack: err.stack } : undefined,
  });
}
