import { Request, Response } from 'express';
import { SaleService } from '../services/sale.service';
import { CreateSaleInput } from '../schemas/sale.schema';

export class SaleController {
  static async create(req: Request, res: Response) {
    try {
      // Garantizado por el middleware requireAuth
      const sellerId = req.user!.id;
      const warehouseId = req.user!.warehouseId;
      const saleData: CreateSaleInput = req.body;
      const idempotencyKey = req.headers['idempotency-key'] as string;

      // Un usuario no puede vender si no está físicamente asignado a una bodega
      if (!warehouseId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Operación denegada: El vendedor no tiene una bodega asignada.' 
        });
      }

      // Es necesario el idempotency para no repetir ventas
      if (!idempotencyKey) {
        return res.status(400).json({ success: false, error: 'Header Idempotency-Key es obligatorio' });
      }

      // Llamamos al servicio con los datos sanitizados y seguros
      const sale = await SaleService.processSale(sellerId, warehouseId, saleData, idempotencyKey);
      
      return res.status(201).json({
        success: true,
        message: 'Venta registrada exitosamente',
        data: sale,
      });
    } catch (error: any) {
      if (error instanceof Error) {
        // Interceptamos errores predecibles
        if (error.message.includes('Stock insuficiente') || error.message.includes('no está activo')) {
          return res.status(400).json({ success: false, error: error.message });
        }
      }
      
      // Logueamos el error real, pero devolvemos algo genérico al cliente
      console.error('[Sale Controller Error]:', error);
      return res.status(500).json({ success: false, error: 'Error interno al procesar la venta' });
    }
  }
}