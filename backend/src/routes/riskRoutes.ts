import { Router } from 'express';
import { getPredictions, getAlerts } from '../controllers/riskController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/:wellId/predictions', getPredictions);
router.get('/:wellId/alerts', getAlerts);

export default router;
