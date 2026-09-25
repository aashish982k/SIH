import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import {
  predictRisks, listRisks, getRisk, resolveRisk,
} from '../controllers/riskController';
import {
  predictRiskSchema, listRisksQuerySchema, resolveRiskSchema,
} from '../validators/riskValidators';

const router = Router();

// ── Static paths BEFORE /:id (implementation.md §10.1) ────────────────────────
router.post('/predict', authenticate, validate(predictRiskSchema), predictRisks);
router.get('/', optionalAuth, validate(listRisksQuerySchema, 'query'), listRisks);

router.get('/:id', optionalAuth, getRisk);
router.post('/:id/resolve', authenticate, validate(resolveRiskSchema), resolveRisk);

export default router;
