import { Request, Response } from 'express';
import { prisma } from '../db/client'; 

export class WarehouseController {
  static async create(req: Request, res: Response): Promise<any> {
    try {
      const { name, location, type } = req.body;
      const warehouse = await prisma.warehouse.create({
        data: { name, location, type: type || 'SUCURSAL' }
      });
      return res.status(201).json({ success: true, data: warehouse });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'Error al crear la bodega' });
    }
  }
  
}

export const getActiveWarehouses = async (_req: Request, res: Response) => {
  const warehouses = await prisma.warehouse.findMany({
    where: { isActive: true },
    select: { id: true, name: true, location: true },
    orderBy: { name: 'asc' },
  });
  return res.json({ success: true, data: warehouses });
};