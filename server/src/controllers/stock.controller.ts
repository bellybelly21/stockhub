import { Request, Response } from 'express';
import { prisma } from '../db/client';

export const getWarehouseStock = async (req: Request, res: Response): Promise<any> => {
  const warehouseId = req.params.warehouseId as string;

  try {
    const stockList = await prisma.stock.findMany({
      where: { warehouseId },
      include: {
        product: {
          select: {
            sku: true,
            barcode: true,
            name: true,
            unitOfMeasure: true,
            criticalStock: true,
          },
        },
      },
    });

    return res.json({ success: true, data: stockList });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Error al consultar el stock' });
  }
};