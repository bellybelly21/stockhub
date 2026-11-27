import { prisma } from '../db/client';
import { Prisma, Role } from '@prisma/client';
import { StockService } from './stock.service';
import { CreateMovementInput } from '../schemas/movement.schema';

interface ActorContext {
  id: string;
  role: Role;
  assignedWarehouseId: number | null;
}

const SELLER_ALLOWED_REASONS = new Set(['DANADO_RECEPCION', 'MERMA_FISICA']);

export class MovementService {
  static async createMovement(input: CreateMovementInput, actor: ActorContext) {
    const { type, quantity, productId, fromWarehouseId, toWarehouseId, reason, comment } = input;

    // Reglas de dominio por Rol (HU-06B)
    if (actor.role === 'VENDEDOR') {
      if (type !== 'MERMA' || quantity <= 0) {
        throw new Error('FORBIDDEN_SELLER_TYPE');
      }
      if (!actor.assignedWarehouseId || fromWarehouseId !== actor.assignedWarehouseId || toWarehouseId) {
        throw new Error('FORBIDDEN_SELLER_WAREHOUSE');
      }
      if (!reason || !SELLER_ALLOWED_REASONS.has(reason)) {
        throw new Error('FORBIDDEN_SELLER_REASON');
      }
    }

    if (actor.role === 'BODEGUERO' && type === 'TRANSFERENCIA_SALIDA') {
      if (!actor.assignedWarehouseId || fromWarehouseId !== actor.assignedWarehouseId) {
        throw new Error('FORBIDDEN_WAREHOUSE_TRANSFER');
      }
    }

    const numericQty = new Prisma.Decimal(Math.abs(quantity));

    // Transacción atómica
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (type === 'TRANSFERENCIA_SALIDA') {
        return await this.executeTransfer(tx, {
          productId,
          fromWarehouseId: fromWarehouseId!,
          toWarehouseId: toWarehouseId!,
          numericQty,
          userId: actor.id,
          comment,
        });
      }

      // Movimientos de una sola bodega
      if (['MERMA', 'DONACION'].includes(type) || (type === 'AJUSTE' && quantity < 0)) {
        await StockService.decrementAtomic(tx, productId, fromWarehouseId!, numericQty);
      } else if (type === 'INGRESO') {
        await StockService.incrementAtomic(tx, productId, toWarehouseId!, numericQty);
      } else if (type === 'AJUSTE' && quantity > 0) {
        await StockService.incrementAtomic(tx, productId, fromWarehouseId!, numericQty);
      }

      return await tx.movement.create({
        data: {
          type,
          quantity: numericQty,
          productId,
          userId: actor.id,
          fromWarehouseId: ['MERMA', 'AJUSTE', 'DONACION'].includes(type) ? (fromWarehouseId ?? null) : null,
          toWarehouseId: type === 'INGRESO' ? (toWarehouseId ?? null) : null,
          reason: reason ?? null,
          comment: comment ?? null,
        },
      });
    });
  }

  private static async executeTransfer(
    tx: Prisma.TransactionClient,
    params: {
      productId: number;
      fromWarehouseId: number;
      toWarehouseId: number;
      numericQty: Prisma.Decimal;
      userId: string;
      comment?: string | undefined;
    }
  ) {
    const { productId, fromWarehouseId, toWarehouseId, numericQty, userId, comment } = params;

    // Bloqueo ordenado por ID de bodega para prevenir deadlocks en concurrencia
    const sortedWarehouses = [fromWarehouseId, toWarehouseId].sort((a, b) => a - b);
    for (const wId of sortedWarehouses) {
      if (wId === fromWarehouseId) {
        await StockService.decrementAtomic(tx, productId, fromWarehouseId, numericQty);
      } else if (wId === toWarehouseId) {
        await StockService.incrementAtomic(tx, productId, toWarehouseId, numericQty);
      }
    }

    const refComment = `Ref: TX-${Date.now()}${comment ? ` - ${comment}` : ''}`;

    const [salida, entrada] = await Promise.all([
      tx.movement.create({
        data: {
          type: 'TRANSFERENCIA_SALIDA',
          quantity: numericQty,
          productId,
          userId,
          fromWarehouseId,
          comment: refComment,
        },
      }),
      tx.movement.create({
        data: {
          type: 'TRANSFERENCIA_ENTRADA',
          quantity: numericQty,
          productId,
          userId,
          toWarehouseId,
          comment: refComment,
        },
      }),
    ]);

    return { salida, entrada };
  }
}