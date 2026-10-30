import { Router } from 'express';
import { createMovement } from '../controllers/movement.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/validate.middleware';
import { createMovementSchema } from '../schemas/movement.schema';

const router = Router();

// Protegemos la ruta
router.post('/', 
  requireAuth, 
  requireRole(['ADMIN', 'BODEGUERO']), 
  validateSchema(createMovementSchema), 
  createMovement
);

export default router;