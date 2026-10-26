import { Request, Response } from 'express';
import { registerSale } from '../services/sale.service';

export const createSale = async (req: Request, res: Response) => {
  try {
    // Datos inyectados por el middleware de JWT
    const { id: sellerId, role, warehouseId } = req.user; 
    const { items } = req.body;

    if (role !== 'VENDEDOR' && role !== 'ADMIN') {
      return res.status(403).json({ error: 'No autorizado para vender' });
    }

    if (!warehouseId) {
      return res.status(400).json({ error: 'El vendedor no tiene una bodega asignada' });
    }

    const sale = await registerSale(sellerId, warehouseId, items);
    
    res.status(201).json({ message: 'Venta registrada exitosamente', sale });
  } catch (error: any) {
    // Captura el error de "Stock insuficiente" del transaction
    res.status(400).json({ error: error.message });
  }
};