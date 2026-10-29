import { Router } from 'express';
import { getWarehouseStock } from '../controllers/stock.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/warehouse/:warehouseId', requireAuth, getWarehouseStock);

export default router;