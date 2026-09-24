import { Router } from 'express';
import { getWellIntelligence, getNearbyIntelligence } from '../controllers/intelligenceController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

// Static segment first so /wells/:wellId/nearby doesn't collide.
router.get('/wells/:wellId/nearby', getNearbyIntelligence);
router.get('/wells/:wellId', getWellIntelligence);

export default router;
