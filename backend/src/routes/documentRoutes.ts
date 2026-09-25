import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { resolveWellSchema } from '../validators/documentValidators';
import * as reportController from '../controllers/reportController';

const router = Router();

router.use(authenticate);
router.get('/unresolved', reportController.listUnresolvedDocuments);
router.post('/:id/resolve-well', validate(resolveWellSchema), reportController.resolveWell);

export default router;
