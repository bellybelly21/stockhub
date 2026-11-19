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
      
      if (['MERMA', 'AJUSTE', 'DONACION', 'TRANSFERENCIA_SALIDA'].includes(type)) {
        // Bloqueo de fila
        const originStocks = await tx.$queryRawUnsafe<{ id: string, quantity: Prisma.Decimal }[]>(
          `SELECT id, quantity FROM "Stock" WHERE "productId" = $1 AND "warehouseId" = $2 FOR UPDATE`,
          productId, 
          fromWarehouseId
        );

        // ASIGNAR Y VALIDAR DIRECTAMENTE
        const originStock = originStocks[0];

        if (!originStock || new Prisma.Decimal(originStock.quantity).lt(numericQuantity)) {
          const available = originStock ? originStock.quantity.toString() : '0';
          throw new Error(`INSUFFICIENT_STOCK:${available}`);
        }

        // USO SEGURO DE LA VARIABLE originStock
        await tx.stock.update({
          where: { id: originStock.id },
          data: { quantity: new Prisma.Decimal(originStock.quantity).minus(numericQuantity) }
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