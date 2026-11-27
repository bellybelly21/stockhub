import { Router } from 'express';
import { getWarehouseStock, getGlobalInventory, registerStockEntry, registerStockOutbound, getCriticalStock } from '../controllers/stock.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();
router.get('/global', requireAuth, getGlobalInventory);
router.get('/warehouse/:warehouseId', requireAuth, getWarehouseStock);
router.post('/entry', requireAuth, requireRole(['ADMIN', 'BODEGUERO']), registerStockEntry);
router.post('/outbound', requireAuth, requireRole(['ADMIN', 'BODEGUERO', 'VENDEDOR']), registerStockOutbound);
router.get('/critical', requireAuth, requireRole(['ADMIN']), getCriticalStock);

export default router;