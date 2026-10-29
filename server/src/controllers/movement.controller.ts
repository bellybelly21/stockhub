import { Request, Response } from 'express';
import { prisma } from '../db/client';

export const createMovement = async (req: Request, res: Response): Promise<any> => {
  const { type, quantity, productId, fromWarehouseId, toWarehouseId, reason, comment } = req.body;
  const userId = req.user!.id; 

  try {
    const result = await prisma.$transaction(async (tx) => {
      
      // Lógica para salidas (MERMA, AJUSTE, DONACION)
      if (['MERMA', 'AJUSTE', 'DONACION'].includes(type)) {
        const currentStock = await tx.stock.findUnique({
          where: { productId_warehouseId: { productId, warehouseId: fromWarehouseId } }
        });

        if (!currentStock || currentStock.quantity.toNumber() < quantity) {
          // Lanzar un Error cancela toda la transacción
          throw new Error('Stock insuficiente en la bodega de origen');
        }

        await tx.stock.update({
          where: { id: currentStock.id },
          data: { quantity: { decrement: quantity } }
        });
      }

      // Lógica para INGRESO
      if (type === 'INGRESO') {
        await tx.stock.upsert({
          where: { productId_warehouseId: { productId, warehouseId: toWarehouseId } },
          update: { quantity: { increment: quantity } },
          create: { productId, warehouseId: toWarehouseId, quantity }
        });
      }

      // Lógica de TRANSFERENCIA

    if (type === 'TRANSFERENCIA') {
    if (!fromWarehouseId || !toWarehouseId) {
      throw new Error('La transferencia requiere una bodega de origen y una de destino');
    }
    if (fromWarehouseId === toWarehouseId) {
      throw new Error('La bodega de origen y destino no pueden ser la misma');
    }
  
    // Validar disponibilidad estricta en bodega de origen
    const originStock = await tx.stock.findUnique({
      where: {
        productId_warehouseId: { productId, warehouseId: fromWarehouseId }
      }
    });
  
    if (!originStock || Number(originStock.quantity) < quantity) {
      throw new Error(`Stock insuficiente en bodega de origen. Disponible: ${originStock ? originStock.quantity : 0}`);
    }
  
    // Descontar stock de la bodega origen
    await tx.stock.update({
      where: {
        productId_warehouseId: { productId, warehouseId: fromWarehouseId }
      },
      data: { quantity: { decrement: quantity } }
    });
  
    // Sumar stock en la bodega destino (creando el registro si no existe)
    await tx.stock.upsert({
      where: {
        productId_warehouseId: { productId, warehouseId: toWarehouseId }
      },
      update: { quantity: { increment: quantity } },
      create: { productId, warehouseId: toWarehouseId, quantity }
    });
  }

      // Registrar el movimiento histórico
      const movement = await tx.movement.create({
        data: {
          type,
          quantity,
          productId,
          userId: req.user!.id,
          fromWarehouseId: type === 'TRANSFERENCIA' || type === 'MERMA' ? fromWarehouseId : null,
          toWarehouseId: type === 'TRANSFERENCIA' || type === 'INGRESO' ? toWarehouseId : null,
          reason,
          comment,
        },
      });

      return movement;
    });

    return res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    // Interceptamos el error específico que lanzamos arriba
    if (error.message === 'Stock insuficiente en la bodega de origen') {
      return res.status(400).json({ success: false, error: error.message });
    }
    
    return res.status(500).json({ success: false, error: 'Error procesando el movimiento', details: error.message });
  }
};