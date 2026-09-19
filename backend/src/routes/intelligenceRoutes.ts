import { Router } from 'express';
import { getNearbyIntelligence } from '../controllers/intelligenceController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/:wellId/nearby', getNearbyIntelligence);

export default router;
