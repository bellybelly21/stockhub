import { Request, Response } from 'express';
import { prisma } from '../db/client';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest } from '../types/express';
import { StockService } from '../services/stock.service';

export const createMovement = async (req: Request, res: Response): Promise<any> => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?.id;

  const { type, quantity, productId, fromWarehouseId, toWarehouseId, reason, comment } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
  }

  // Convertimos a absoluto para las operaciones atómicas de Prisma
  const numericQty = new Prisma.Decimal(Math.abs(quantity));
  
  // Determinamos la dirección del ajuste
  const isPositiveAdjustment = type === 'AJUSTE' && quantity > 0;
  const isNegativeAdjustment = type === 'AJUSTE' && quantity < 0;

  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      
      // =========================================================
      // FLUJO DE TRANSFERENCIAS
      // =========================================================
      if (type === 'TRANSFERENCIA_SALIDA') {
        if (!fromWarehouseId || !toWarehouseId) throw new Error('Faltan bodegas para transferencia');
        
        const sortedWarehouses = [fromWarehouseId, toWarehouseId].sort();

        for (const wId of sortedWarehouses) {
          if (wId === fromWarehouseId) {
            await StockService.decrementAtomic(tx, productId, fromWarehouseId, numericQty);
          }
          if (wId === toWarehouseId) {
            await StockService.incrementAtomic(tx, productId, toWarehouseId, numericQty);
          }
        }

        // Trazabilidad por partida doble
        const timestamp = new Date().getTime();
        const refComment = `Ref: TX-${timestamp}${comment ? ` - ${comment}` : ''}`;

        const salida = await tx.movement.create({
          data: { type: 'TRANSFERENCIA_SALIDA', quantity: numericQty, productId, userId, fromWarehouseId, comment: refComment }
        });

        const entrada = await tx.movement.create({
          data: { type: 'TRANSFERENCIA_ENTRADA', quantity: numericQty, productId, userId, toWarehouseId: toWarehouseId, comment: refComment }
        });

        return { salida, entrada };
      }

      // =========================================================
      // FLUJO ESTÁNDAR (Ingresos, Mermas, Ajustes, Donaciones)
      // =========================================================
      if (['MERMA', 'DONACION'].includes(type) || isNegativeAdjustment) {
        await StockService.decrementAtomic(tx, productId, fromWarehouseId, numericQty);
      } else if (type === 'INGRESO') {
        await StockService.incrementAtomic(tx, productId, toWarehouseId, numericQty);
      } else if (isPositiveAdjustment) {
        await StockService.incrementAtomic(tx, productId, fromWarehouseId, numericQty);
      }

      // Registrar auditoría de movimiento
      return await tx.movement.create({
        data: {
          type,
          quantity: numericQty,
          productId,
          userId,
          fromWarehouseId: ['MERMA', 'AJUSTE', 'DONACION'].includes(type) ? fromWarehouseId : null,
          toWarehouseId: type === 'INGRESO' ? toWarehouseId : null,
          reason: reason || null,
          comment: comment || null,
        },
      });
    });

    return res.status(201).json({ success: true, data: result });

  } catch (error: any) {
    if (typeof error.message === 'string') {
      if (error.message.startsWith('INSUFFICIENT_STOCK')) {
        const available = error.message.split(':')[1];
        return res.status(400).json({ 
          success: false, 
          error: `Stock insuficiente en la bodega de origen. Disponible: ${available}` 
        });
      }

      if (error.message.startsWith('CONCURRENCY_ERROR')) {
        return res.status(409).json({
          success: false,
          error: 'Conflicto de concurrencia: el inventario fue actualizado por otro usuario. Por favor, reintente.'
        });
      }
    }

    console.error('[Movement Error]:', error);
    return res.status(500).json({ success: false, error: 'Error interno al procesar el movimiento' });
  }
};