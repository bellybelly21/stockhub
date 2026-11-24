import { Router } from 'express';
import { getAdminDashboard } from '../controllers/dashboard.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/summary', requireAuth, requireRole(['ADMIN']), getAdminDashboard);

export default router;