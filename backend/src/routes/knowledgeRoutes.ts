import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { getKnowledge } from '../controllers/knowledgeController';

const router = Router();
router.get('/', authenticate, getKnowledge);
export default router;
