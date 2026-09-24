import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import {
  predictRisks, listRisks, getRisk, resolveRisk,
} from '../controllers/riskController';
import {
  predictRiskSchema, listRisksQuerySchema, resolveRiskSchema,
} from '../validators/riskValidators';

const router = Router();

router.use(authenticate);

// ── Static paths BEFORE /:id (implementation.md §10.1) ────────────────────────
router.post('/predict', validate(predictRiskSchema), predictRisks);
router.get('/', validate(listRisksQuerySchema, 'query'), listRisks);

router.get('/:id', getRisk);
router.post('/:id/resolve', validate(resolveRiskSchema), resolveRisk);

export default router;
