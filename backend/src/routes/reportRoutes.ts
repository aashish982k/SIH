import { Router } from 'express';
import { optionalAuth } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';
import * as reportController from '../controllers/reportController';

const router = Router();

router.post('/upload', optionalAuth, upload.single('file'), reportController.uploadReport);
router.post('/generate', optionalAuth, reportController.generateReport);
router.get('/', optionalAuth, reportController.listReports);
router.get('/:id/download', optionalAuth, reportController.downloadReport);
router.get('/:id', optionalAuth, reportController.getReport);

export default router;
