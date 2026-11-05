import { Request, Response } from 'express';
import { prisma } from '../db/client';

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
      orderBy: { product: { name: 'asc' } }
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
      orderBy: { product: { name: 'asc' } }
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