import { Router } from 'express';
import {
  exportDailyStock,
  exportSalesConsolidated,
  exportSellerPerformance,
} from '../controllers/report.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth, requireRole(['ADMIN']));

router.get('/stock', exportDailyStock);
router.get('/sales', exportSalesConsolidated);
router.get('/sellers', exportSellerPerformance);

export default router;