import { Request, Response } from 'express';
import { registerSale } from '../services/sale.service';

export const createSale = async (req: Request, res: Response) => {
  try {
    const { id: sellerId, role, warehouseId } = req.user; 
    const { items } = req.body;

    // Validación estricta de entrada
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'El listado de productos (items) es requerido y debe ser un arreglo válido.' });
    }

    // Validación de formato de cada ítem
    for (const item of items) {
      if (!item.productId || typeof item.quantity !== 'number' || typeof item.unitPrice !== 'number') {
        return res.status(400).json({ error: 'Formato de ítem inválido. Se requiere productId (string), quantity (number) y unitPrice (number).' });
      }
    }

    if (role !== 'VENDEDOR' && role !== 'ADMIN') {
      return res.status(403).json({ error: 'No autorizado para vender' });
    }

    if (!warehouseId) {
      return res.status(400).json({ error: 'El vendedor no tiene una bodega asignada' });
    }

    const sale = await registerSale(sellerId, warehouseId, items);
    
    res.status(201).json({ message: 'Venta registrada exitosamente', sale });
  } catch (error: any) {
    // Intercepción de errores
    if (error instanceof Error && error.message.includes('Stock insuficiente')) {
      return res.status(400).json({ error: error.message });
    }
    
    // Log interno del error real, pero respuesta sanitizada al cliente
    console.error('[Sale Error]:', error);
    return res.status(500).json({ error: 'Error interno al procesar la venta.' });
  }
};