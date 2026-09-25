import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { createWellSchema, updateWellSchema, fillEmptyFieldsSchema, nearbyQuerySchema, listWellsQuerySchema } from '../validators/wellValidators';
import * as wellController from '../controllers/wellController';

const router = Router();

// Public / optional-auth
router.get('/nearby', validate(nearbyQuerySchema, 'query'), wellController.getNearbyWells);
router.get('/stats/global', optionalAuth, wellController.getGlobalWellStats);
router.get('/', validate(listWellsQuerySchema, 'query'), optionalAuth, wellController.listWells);
router.get('/:id', optionalAuth, wellController.getWell);

// Authenticated
router.post('/',    authenticate, validate(createWellSchema), wellController.createWell);
router.put('/:id',  authenticate, validate(updateWellSchema), wellController.updateWell);
router.post('/:id/fill-fields', authenticate, validate(fillEmptyFieldsSchema), wellController.fillEmptyFields);
router.post('/:id/contributions/:contributionId/reverse', authenticate, wellController.reverseContribution);
router.delete('/:id', authenticate, wellController.deleteWell);

export default router;
