import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { createEventSchema, listEventsQuerySchema } from '../validators/eventValidators';
import * as eventController from '../controllers/eventController';

const router = Router();

router.get('/',    validate(listEventsQuerySchema, 'query'), optionalAuth, eventController.listEvents);
router.get('/:id', optionalAuth, eventController.getEvent);
router.post('/',   authenticate, validate(createEventSchema), eventController.createEvent);

export default router;
