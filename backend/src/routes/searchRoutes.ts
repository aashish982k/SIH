import { Router } from 'express';
import { searchKnowledge } from '../controllers/searchController';
import { authenticate } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { searchKnowledgeSchema } from '../validators/searchValidators';

const router = Router();

router.use(authenticate);

router.post('/', validate(searchKnowledgeSchema), searchKnowledge);

export default router;
