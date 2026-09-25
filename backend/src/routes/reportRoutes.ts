import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';
import * as reportController from '../controllers/reportController';

const router = Router();

// All report routes require authentication (any authenticated user, not admin-only)
router.post('/upload', authenticate, upload.single('file'), reportController.uploadReport);
router.get('/',        authenticate, reportController.listReports);
router.get('/stats/global', authenticate, reportController.getGlobalReportStats);
router.get('/:id/status', authenticate, reportController.getReportStatus);
router.get('/:id',     authenticate, reportController.getReport);
router.post('/:id/resolve-well', authenticate, reportController.resolveWell);

export default router;
