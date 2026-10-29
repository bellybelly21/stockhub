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