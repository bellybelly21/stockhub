import { Router } from 'express';
import { createWarehouse, getActiveWarehouses } from '../controllers/warehouse.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/validate.middleware';
import { createWarehouseSchema } from '../schemas/warehouse.schema';

const router = Router();

// GET /api/warehouses (Todos los roles autenticados pueden listar bodegas activas)
router.get('/', requireAuth, getActiveWarehouses);

// POST /api/warehouses (Solo ADMIN puede crear bodegas)
router.post(
  '/',
  requireAuth,
  requireRole(['ADMIN']),
  validateSchema(createWarehouseSchema),
  createWarehouse
);

export default router;