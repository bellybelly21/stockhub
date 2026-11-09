import { Router } from 'express';
import { getWarehouseStock, getGlobalInventory, registerStockEntry, registerStockOutbound } from '../controllers/stock.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();
router.get('/global', requireAuth, getGlobalInventory);
router.get('/warehouse/:warehouseId', requireAuth, getWarehouseStock);
router.post('/entry', requireAuth, registerStockEntry);
router.post('/outbound', requireAuth, registerStockOutbound);

export default router;