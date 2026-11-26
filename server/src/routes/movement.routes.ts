import { Router, Request, Response, NextFunction } from 'express';
import { createMovement } from '../controllers/movement.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/validate.middleware';
import { createMovementSchema } from '../schemas/movement.schema';

const router = Router();

const SELLER_ALLOWED_REASONS = ['DANADO_RECEPCION', 'VENCIMIENTO'];

const enforceMovementRolePolicy = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;

  if (user?.role === 'VENDEDOR') {
    if (!user.assignedWarehouseId) {
      return res.status(400).json({
        success: false,
        error: 'El vendedor no tiene una bodega operativa asignada.',
      });
    }

    // Solo puede registrar AJUSTE negativo
    if (req.body?.type !== 'AJUSTE' || Number(req.body?.quantity) >= 0) {
      return res.status(403).json({
        success: false,
        error: 'Los vendedores solo pueden registrar ajustes negativos por daño o vencimiento.',
      });
    }

    // No puede especificar bodega destino
    if (req.body?.toWarehouseId) {
      return res.status(403).json({
        success: false,
        error: 'Operación no válida para punto de venta.',
      });
    }

    // Solo puede descontar de su propia bodega asignada
    if (req.body?.fromWarehouseId !== user.assignedWarehouseId) {
      return res.status(403).json({
        success: false,
        error: 'Solo puedes descontar stock de tu bodega asignada.',
      });
    }

    // Solo motivos permitidos para vendedor
    if (!SELLER_ALLOWED_REASONS.includes(req.body?.reason)) {
      return res.status(403).json({
        success: false,
        error: 'Motivo de ajuste no permitido para el rol de vendedor.',
      });
    }
  }

  next();
};

router.post(
  '/',
  requireAuth,
  requireRole(['ADMIN', 'BODEGUERO', 'VENDEDOR']),
  enforceMovementRolePolicy,
  validateSchema(createMovementSchema),
  createMovement
);

export default router;