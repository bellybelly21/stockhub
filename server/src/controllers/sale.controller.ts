import { Request, Response } from 'express';
import { SaleService } from '../services/sale.service';
import { CreateSaleInput } from '../schemas/sale.schema';
import { AuthenticatedRequest } from '../types/express';

export class SaleController {
  static async create(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const sellerId = authReq.user!.id;
      const warehouseId = authReq.user!.assignedWarehouseId;
      const saleData: CreateSaleInput = req.body;
      const idempotencyKey = req.headers['idempotency-key'] as string;

      if (!warehouseId) {
        return res.status(400).json({
          success: false,
          error: 'Operación denegada: El vendedor no tiene una bodega asignada.',
        });
      }

      if (!idempotencyKey || idempotencyKey.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Header Idempotency-Key es obligatorio',
        });
      }

      const { sale, isReplay } = await SaleService.processSale(
        sellerId,
        warehouseId,
        saleData,
        idempotencyKey.trim()
      );

      // 200 OK si es un reintento idempotente; 201 Created si es nueva
      const statusCode = isReplay ? 200 : 201;
      const message = isReplay
        ? 'Venta recuperada por idempotencia'
        : 'Venta registrada exitosamente';

      return res.status(statusCode).json({
        success: true,
        message,
        data: sale,
      });
    } catch (error: any) {
      if (typeof error.message === 'string') {
        if (error.message === 'IDEMPOTENCY_PAYLOAD_MISMATCH') {
          return res.status(409).json({
            success: false,
            error: 'Conflicto de idempotencia: La clave ya fue utilizada con un detalle de productos diferente.',
          });
        }

        if (error.message.startsWith('INSUFFICIENT_STOCK')) {
          const available = error.message.split(':')[1];
          return res.status(400).json({
            success: false,
            error: `Stock insuficiente para completar la venta. Disponible: ${available}`,
          });
        }

        if (error.message.startsWith('CONCURRENCY_EXHAUSTED')) {
          res.setHeader('Retry-After', '1'); // Sugerir reintento en 1 segundo
          return res.status(503).json({
            success: false,
            error: 'Servicio temporalmente saturado por alta concurrencia. Por favor, reintente en unos instantes.',
          });
        }

        if (error.message.startsWith('CONCURRENCY_ERROR')) {
          return res.status(409).json({
            success: false,
            error: 'Conflicto de concurrencia en el inventario. Por favor, intente nuevamente.',
          });
        }

        if (
          error.message.includes('no está activo') ||
          error.message.includes('Mapeo de precio fallido')
        ) {
          return res.status(400).json({ success: false, error: error.message });
        }
      }

      console.error('[Sale Controller Error]:', error);
      return res.status(500).json({ success: false, error: 'Error interno al procesar la venta' });
    }
  }
}