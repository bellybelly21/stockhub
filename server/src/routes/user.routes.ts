import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/validate.middleware';
import { createUserSchema, updateUserSchema } from '../schemas/user.schema';
import { Role } from '@prisma/client';

const router = Router();

// Todas las rutas de administración de usuarios requieren autenticación y rol ADMIN
router.use(requireAuth, requireRole([Role.ADMIN]));

router.post('/', validateSchema(createUserSchema), UserController.create);
router.get('/', UserController.getAll);
router.patch('/:id', validateSchema(updateUserSchema), UserController.update);

export default router;