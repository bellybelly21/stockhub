import { Request, Response } from 'express';
import { prisma } from '../db/client';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest } from '../types/express';

export const createMovement = async (req: Request, res: Response): Promise<any> => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;

  const { type, quantity, productId, fromWarehouseId, toWarehouseId, reason, comment } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
  }

  const numericQuantity = new Prisma.Decimal(quantity);

  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Validar y descontar origen (Salidas y Transferencias)
      if (['MERMA', 'AJUSTE', 'DONACION', 'TRANSFERENCIA_SALIDA'].includes(type)) {
        const originStock = await tx.stock.findUnique({
          where: { productId_warehouseId: { productId, warehouseId: fromWarehouseId } }
        });

        if (!originStock || originStock.quantity.lessThan(numericQuantity)) {
          throw new Error(`INSUFFICIENT_STOCK:${originStock ? originStock.quantity.toString() : '0'}`);
        }

        await tx.stock.update({
          where: { id: originStock.id },
          data: { quantity: { decrement: numericQuantity } }
        });
      }

      // Incrementar destino (Ingresos y Transferencias)
      if (['INGRESO', 'TRANSFERENCIA_SALIDA'].includes(type)) {
        await tx.stock.upsert({
          where: { productId_warehouseId: { productId, warehouseId: toWarehouseId } },
          update: { quantity: { increment: numericQuantity } },
          create: { productId, warehouseId: toWarehouseId, quantity: numericQuantity }
        });
      }

      // Registrar auditoría de movimiento
      return await tx.movement.create({
        data: {
          type,
          quantity: numericQuantity,
          productId,
          userId,
          fromWarehouseId: ['TRANSFERENCIA_SALIDA', 'MERMA', 'AJUSTE', 'DONACION'].includes(type) ? fromWarehouseId : null,
          toWarehouseId: ['TRANSFERENCIA_SALIDA', 'INGRESO'].includes(type) ? toWarehouseId : null,
          reason: reason || null,
          comment: comment || null,
        },
      });
    });

    return res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    if (typeof error.message === 'string' && error.message.startsWith('INSUFFICIENT_STOCK')) {
      const available = error.message.split(':')[1];
      return res.status(400).json({ 
        success: false, 
        error: `Stock insuficiente en la bodega de origen. Disponible: ${available}` 
      });
    }

    console.error('[Movement Error]:', error);
    return res.status(500).json({ success: false, error: 'Error interno al procesar el movimiento' });
  }
};