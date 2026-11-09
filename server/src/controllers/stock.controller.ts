import { Request, Response } from 'express';
import { prisma } from '../db/client';
import { StockService } from '../services/stock.service';

export const getGlobalInventory = async (req: Request, res: Response): Promise<any> => {
  try {
    const { warehouseId, status, search } = req.query;

    const stockRecords = await prisma.stock.findMany({
      where: {
        ...(warehouseId && warehouseId !== 'Todas' ? { warehouseId: String(warehouseId) } : {}),
        product: {
          ...(status && status !== 'Todos' ? { status: status as any } : {}),
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

    const formattedData = stockRecords.map((s) => ({
      sku: s.product.sku,
      barcode: s.product.barcode,
      name: s.product.name,
      brand: s.product.brand,
      warehouse: s.warehouse.name,
      stock: Number(s.quantity), 
      criticalStock: Number(s.product.criticalStock),
      status: s.product.status,
    }));

    return res.json({ success: true, data: formattedData });
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

    const formattedData = stockRecords.map((s) => ({
      sku: s.product.sku,
      barcode: s.product.barcode,
      name: s.product.name,
      brand: s.product.brand,
      warehouse: s.warehouse.name,
      stock: Number(s.quantity), 
      criticalStock: Number(s.product.criticalStock),
      status: s.product.status,
    }));

    return res.json({ success: true, data: formattedData });
  } catch (error) {
    console.error('[Warehouse Stock Query Error]:', error);
    return res.status(500).json({ success: false, error: 'Error al consultar el inventario de la bodega' });
  }
};

export const registerStockEntry = async (req: Request, res: Response): Promise<any> => {
  try {
    const { productId, warehouseId, quantity } = req.body;

    if (!productId || !warehouseId || !quantity || quantity <= 0) {
      return res.status(400).json({ success: false, error: 'Datos de entrada inválidos' });
    }

    const result = await StockService.addStock({
      productId,
      warehouseId,
      quantity: Number(quantity),
      userId: (req as any).user.id 
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

export const registerStockOutbound = async (req: Request, res: Response): Promise<any> => {
  try {
    const { productId, warehouseId, quantity, type, reason, comment } = req.body;

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
      userId: (req as any).user.id,
      type,
      reason,
      comment
    });

    return res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    console.error('[Stock Outbound Error]:', error);
    
    if (error.message.includes('Stock insuficiente')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    
    return res.status(500).json({ success: false, error: error.message || 'Error al registrar la salida de stock' });
  }
};