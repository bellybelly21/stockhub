import { Request, Response } from 'express';
import { prisma } from '../db/client';
import { StockService } from '../services/stock.service';
import { ProductStatus } from '@prisma/client';
import { AuthenticatedRequest } from '../types/express';
/**
 * Función privada para unificar el formateo de las respuestas de inventario
 */
const formatStockResponse = (stockRecords: any[]) => {
  return stockRecords.map((s) => ({
    sku: s.product.sku,
    barcode: s.product.barcode,
    name: s.product.name,
    brand: s.product.brand,
    warehouse: s.warehouse.name,
    stock: Number(s.quantity),
    criticalStock: Number(s.product.criticalStock),
    status: s.product.status,
  }));
};

export const getGlobalInventory = async (req: Request, res: Response): Promise<any> => {
  try {
    const { warehouseId, status, search } = req.query;

    // Validación segura del status contra el Enum de Prisma (evita inyecciones)
    const validStatus = Object.values(ProductStatus).includes(status as ProductStatus)
      ? (status as ProductStatus)
      : undefined;

    const stockRecords = await prisma.stock.findMany({
      where: {
        ...(warehouseId && warehouseId !== 'Todas' ? { warehouseId: String(warehouseId) } : {}),
        product: {
          ...(validStatus ? { status: validStatus } : {}),
          ...(search ? {
            OR: [
              { name: { contains: String(search), mode: 'insensitive' } },
              { sku: { contains: String(search), mode: 'insensitive' } },
              { barcode: { contains: String(search), mode: 'insensitive' } },
            ]
          } : {})
        }
      },
      include: {
        product: true,
        warehouse: { select: { name: true } }
      },
      orderBy: { product: { name: 'desc' } }
    });

    return res.json({ success: true, data: formatStockResponse(stockRecords) });
  } catch (error) {
    console.error('[Inventory Query Error]:', error);
    return res.status(500).json({ success: false, error: 'Error al consultar el inventario global' });
  }
};

export const getWarehouseStock = async (req: Request, res: Response): Promise<any> => {
  try {
    const warehouseId = String(req.params.warehouseId);
    const stockRecords = await prisma.stock.findMany({
      where: { warehouseId },
      include: {
        product: true,
        warehouse: { select: { name: true } }
      },
      orderBy: { product: { name: 'desc' } }
    });

    return res.json({ success: true, data: formatStockResponse(stockRecords) });
  } catch (error) {
    console.error('[Warehouse Stock Query Error]:', error);
    return res.status(500).json({ success: false, error: 'Error al consultar el inventario de la bodega' });
  }
};

// ==========================================
// CONTROLADORES DE MUTACIÓN (Deprecados)
// ==========================================

/**
 * @deprecated Usa POST /api/movements en su lugar.
 */
export const registerStockEntry = async (req: Request, res: Response): Promise<any> => {
  try {
    const { productId, warehouseId, quantity } = req.body;
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    if (!productId || !warehouseId || !quantity || quantity <= 0) {
      return res.status(400).json({ success: false, error: 'Datos de entrada inválidos' });
    }

    const result = await StockService.addStock({
      productId,
      warehouseId,
      quantity: Number(quantity),
      userId
    });

    return res.status(200).json({
      success: true,
      previousStock: result.previousStock,
      addedQuantity: result.addedQuantity,
      newStock: result.newStock
    });
  } catch (error: any) {
    console.error('[Stock Entry Error]:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error al registrar entrada de stock' });
  }
};

/**
 * @deprecated Usa POST /api/movements en su lugar.
 */
export const registerStockOutbound = async (req: Request, res: Response): Promise<any> => {
  try {
    const { productId, warehouseId, quantity, type, reason, comment } = req.body;
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    if (!productId || !warehouseId || !quantity || !type || !reason || Number(quantity) <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Debe indicar producto, bodega, cantidad válida (> 0), tipo de egreso y motivo (reason).' 
      });
    }

    const result = await StockService.registerOutbound({
      productId,
      warehouseId,
      quantity: Number(quantity),
      userId,
      type,
      reason,
      comment
    });

    return res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    console.error('[Stock Outbound Error]:', error);
    
    if (typeof error.message === 'string') {
      if (error.message.startsWith('INSUFFICIENT_STOCK')) {
        const available = error.message.split(':')[1];
        return res.status(400).json({ 
          success: false, 
          error: `Stock insuficiente para realizar esta salida. Disponible: ${available}` 
        });
      }

      if (error.message.startsWith('CONCURRENCY_ERROR')) {
        return res.status(409).json({ 
          success: false, 
          error: 'Conflicto de concurrencia: el stock fue modificado por otro usuario. Reintente.' 
        });
      }
    }
    
    return res.status(500).json({ success: false, error: error.message || 'Error interno al registrar la salida de stock' });
  }
};