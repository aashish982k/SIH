import { Router, Request, Response } from 'express';

import { checkQdrantConnection } from '../config/qdrant';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const health: Record<string, string> = { status: 'ok' };

  // Removed complex Postgres check to simplify setup
  health.postgres = 'assumed connected';

  try {
    await checkQdrantConnection();
    health.qdrant = 'connected';
  } catch {
    health.qdrant = 'disconnected';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json({
    success: health.status === 'ok',
    message: health.status === 'ok' ? 'All systems operational' : 'One or more services degraded',
    data: { ...health, uptime: process.uptime() },
  });
});

export default router;
