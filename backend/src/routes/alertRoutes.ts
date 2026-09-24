import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { alertService } from '../services/alertService';
import { sendSuccess } from '../utils/response';

const router = Router();

router.patch('/:id/acknowledge', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await alertService.markAlertSeen(req.params.id);
    sendSuccess(res, null, 'Alert acknowledged');
  } catch (err) {
    next(err);
  }
});

router.post('/acknowledge-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const wellId = req.body.well_id;
    if (wellId) {
      await alertService.markAllAlertsSeenForWell(wellId);
    }
    sendSuccess(res, null, 'All alerts acknowledged');
  } catch (err) {
    next(err);
  }
});

export default router;
