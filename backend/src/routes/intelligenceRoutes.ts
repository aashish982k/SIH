import { Router } from 'express';
import { getNearbyIntelligence, getOverviewStats } from '../controllers/intelligenceController';
import { optionalAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(optionalAuth);

router.get('/overview', getOverviewStats);
router.get('/:wellId/nearby', getNearbyIntelligence);

export default router;
