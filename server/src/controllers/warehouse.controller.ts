import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { WarehouseService } from '../services/warehouse.service';

export const getActiveWarehouses = async (req: Request, res: Response): Promise<any> => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user) {
    return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
  }

  try {
    const warehouses = await WarehouseService.getActiveWarehouses(authReq.user);
    return res.status(200).json({ success: true, data: warehouses });
  } catch (error) {
    console.error('[Warehouse Error - GET]:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener las bodegas' });
  }
};

export const createWarehouse = async (req: Request, res: Response): Promise<any> => {
  try {
    const warehouse = await WarehouseService.createWarehouse(req.body);
    return res.status(201).json({ success: true, data: warehouse });
  } catch (error: any) {
    if (error.message === 'WAREHOUSE_EXISTS_INACTIVE') {
      return res.status(409).json({
        success: false,
        error: 'Ya existe una bodega desactivada con ese nombre. Reactívela en lugar de crear una nueva.',
      });
    }

    if (error.message === 'WAREHOUSE_ALREADY_EXISTS') {
      return res.status(409).json({
        success: false,
        error: 'Ya existe una bodega activa registrada con ese nombre.',
      });
    }

    console.error('[Warehouse Error - POST]:', error);
    return res.status(500).json({ success: false, error: 'Error interno al crear la bodega' });
  }
};