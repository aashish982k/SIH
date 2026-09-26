import { Router } from 'express';
import { getPredictions, getAlerts, listAllRisks, getRiskOverview } from '../controllers/riskController';
import { optionalAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(optionalAuth);

router.get('/', listAllRisks);
router.get('/overview', getRiskOverview);
router.get('/:wellId/predictions', getPredictions);
router.get('/:wellId/alerts', getAlerts);

export default router;
