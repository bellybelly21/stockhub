import { Request, Response } from 'express';
import { SaleService } from '../services/sale.service';
import { CreateSaleInput } from '../schemas/sale.schema';

export class SaleController {

  static async create(req: Request, res: Response) {
    try {
      const sellerId = req.user!.id;
      const warehouseId = req.user!.warehouseId;
      const saleData: CreateSaleInput = req.body;
      const idempotencyKey = req.headers['idempotency-key'] as string;


      if (!warehouseId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Operación denegada: El vendedor no tiene una bodega asignada.' 
        });
      }

      if (!idempotencyKey) {
        return res.status(400).json({ success: false, error: 'Header Idempotency-Key es obligatorio' });
      }

      const sale = await SaleService.processSale(sellerId, warehouseId, saleData, idempotencyKey);
      
      return res.status(201).json({
        success: true,
        message: 'Venta registrada exitosamente',
        data: sale,
      });
    } catch (error: any) {
      if (error instanceof Error) {
        if (error.message.includes('Stock insuficiente') || error.message.includes('no está activo') || error.message.includes('Mapeo de precio fallido')) {
          return res.status(400).json({ success: false, error: error.message });
        }
      }
      
      console.error('[Sale Controller Error]:', error);
      return res.status(500).json({ success: false, error: 'Error interno al procesar la venta' });
    }
  }
}