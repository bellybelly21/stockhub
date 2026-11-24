import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { MovementService } from '../services/movement.service';

const ERROR_MAP: Record<string, { status: number; message: string }> = {
  FORBIDDEN_SELLER_TYPE: {
    status: 403,
    message: 'Los vendedores solo pueden registrar ajustes negativos por daño o vencimiento.',
  },
  FORBIDDEN_SELLER_WAREHOUSE: {
    status: 403,
    message: 'Solo puedes descontar stock de tu bodega asignada.',
  },
  FORBIDDEN_SELLER_REASON: {
    status: 403,
    message: 'Motivo de ajuste no permitido para el rol de vendedor.',
  },
  CONCURRENCY_ERROR: {
    status: 409,
    message: 'Conflicto de concurrencia: el inventario fue actualizado por otro usuario. Reintente.',
  },
};

export const createMovement = async (req: Request, res: Response): Promise<any> => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user?.id) {
    return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
  }

  try {
    const result = await MovementService.createMovement(req.body, authReq.user);
    return res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    if (typeof error.message === 'string') {
      if (error.message.startsWith('INSUFFICIENT_STOCK')) {
        const available = error.message.split(':')[1];
        return res.status(400).json({
          success: false,
          error: `Stock insuficiente en la bodega de origen. Disponible: ${available}`,
        });
      }

      const matchedError = Object.entries(ERROR_MAP).find(([key]) =>
        error.message.startsWith(key)
      );
      if (matchedError) {
        const { status, message } = matchedError[1];
        return res.status(status).json({ success: false, error: message });
      }
    }

    console.error('[Movement Error]:', error);
    return res.status(500).json({ success: false, error: 'Error interno al procesar el movimiento' });
  }
};