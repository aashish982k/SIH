import { Router } from 'express';
import { getRecommendations } from '../controllers/recommendationController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/:wellId/recommendations', getRecommendations);

export default router;
