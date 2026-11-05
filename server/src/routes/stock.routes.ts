import { Router } from 'express';
import { getWarehouseStock, getGlobalInventory } from '../controllers/stock.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();
router.get('/global', requireAuth, getGlobalInventory);
router.get('/warehouse/:warehouseId', requireAuth, getWarehouseStock);

export default router;