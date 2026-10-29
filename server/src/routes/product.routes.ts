import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/validate.middleware';
import { createProductSchema, updateProductSchema } from '../schemas/product.schema';
import { Role } from '@prisma/client';

const router = Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

// GET: Disponible para todos los roles (Admin, Bodeguero, Vendedor)
router.get('/', ProductController.getAll);

// POST / PATCH: Solo Admin y Bodeguero
router.post('/', requireRole([Role.ADMIN, Role.BODEGUERO]), validateSchema(createProductSchema), ProductController.create);
router.patch('/:id', requireRole([Role.ADMIN, Role.BODEGUERO]), validateSchema(updateProductSchema), ProductController.update);

// DELETE: solo admin
router.delete('/:id', requireAuth, requireRole([Role.ADMIN]), ProductController.delete);

export default router;