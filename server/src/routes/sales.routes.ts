import { Router } from 'express';
//import { createSale } from '../controllers/sale.controller';
import { SaleController } from '../controllers/sale.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/validate.middleware';
import { createSaleSchema } from '../schemas/sale.schema';

const router = Router();

// Endpoint priv que requiere token JWT válido y formato de venta correcto
router.post('/', requireAuth, validateSchema(createSaleSchema), requireRole(['ADMIN', 'VENDEDOR']), SaleController.create);

export default router;