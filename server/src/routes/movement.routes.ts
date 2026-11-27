import { Router, Request, Response, NextFunction } from 'express';
import { createMovement } from '../controllers/movement.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validateSchema } from '../middlewares/validate.middleware';
import { createMovementSchema } from '../schemas/movement.schema';

const router = Router();

const SELLER_ALLOWED_REASONS = ['DANADO_RECEPCION', 'MERMA_FISICA'] as const;

const enforceMovementRolePolicy = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;

  if (user?.role === 'VENDEDOR') {
    if (!user.assignedWarehouseId) {
      return res.status(400).json({
        success: false,
        error: 'El vendedor no tiene una bodega operativa asignada.',
      });
    }

    // HU-06B: Solo puede registrar MERMA con cantidad positiva
    const qty = Number(req.body?.quantity);
    if (req.body?.type !== 'MERMA' || Number.isNaN(qty) || qty <= 0) {
      return res.status(403).json({
        success: false,
        error: 'Los vendedores solo pueden registrar mermas con cantidad positiva por daño o merma física.',
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
    if (Number(req.body?.fromWarehouseId) !== user.assignedWarehouseId) {
      return res.status(403).json({
        success: false,
        error: 'Solo puedes descontar stock de tu bodega asignada.',
      });
    }

    // Solo motivos permitidos para vendedor (HU-06B)
    if (!SELLER_ALLOWED_REASONS.includes(req.body?.reason)) {
      return res.status(403).json({
        success: false,
        error: 'Motivo de merma no permitido para el rol de vendedor.',
      });
    }
  }

  if (user?.role === 'BODEGUERO' && req.body?.type === 'TRANSFERENCIA_SALIDA') {
    if (!user.assignedWarehouseId) {
      return res.status(400).json({
        success: false,
        error: 'El bodeguero no tiene una bodega operativa asignada.',
      });
    }

    if (
      req.body?.fromWarehouseId !== undefined &&
      Number(req.body.fromWarehouseId) !== user.assignedWarehouseId
    ) {
      return res.status(403).json({
        success: false,
        error: 'Solo puedes transferir stock desde tu bodega asignada.',
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