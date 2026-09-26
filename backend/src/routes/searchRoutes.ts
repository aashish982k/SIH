import { Router } from 'express';
import { searchKnowledge } from '../controllers/searchController';
import { optionalAuth } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { searchKnowledgeSchema } from '../validators/searchValidators';

const router = Router();

router.use(optionalAuth);

router.post('/', validate(searchKnowledgeSchema), searchKnowledge);

export default router;
