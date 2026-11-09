import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/validate.middleware';
import { createProductSchema, updateProductSchema } from '../schemas/product.schema';
import { Role } from '@prisma/client';

const router = Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

router.get('/search', ProductController.searchByCode);
router.get('/', ProductController.getAll);
router.post('/', requireRole([Role.ADMIN, Role.BODEGUERO]), validateSchema(createProductSchema), ProductController.create);

router.get('/:id', ProductController.getById);
router.patch('/:id', requireRole([Role.ADMIN, Role.BODEGUERO]), validateSchema(updateProductSchema), ProductController.update);


export default router;