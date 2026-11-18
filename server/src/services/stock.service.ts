import { prisma } from '../db/client';
import { MovementType, AdjustmentReason, Prisma } from '@prisma/client';

export class StockService {
  static async addStock({ productId, warehouseId, quantity, userId }: { productId: string; warehouseId: string; quantity: number; userId: string }) {
    return await prisma.$transaction(async (tx) => {
      // Buscar si ya existe el registro de stock para ese producto en esa bodega
      const existingStock = await tx.stock.findUnique({
        where: {
          productId_warehouseId: { productId, warehouseId }
        }
      });

      const previousStock = existingStock ? Number(existingStock.quantity) : 0;
      const newStock = previousStock + quantity;

      // Crear o actualizar el registro de stock
      await tx.stock.upsert({
        where: {
          productId_warehouseId: { productId, warehouseId }
        },
        update: {
          quantity: { increment: quantity }
        },
        create: {
          productId,
          warehouseId,
          quantity
        }
      });

      // Registrar el movimiento en el historial (InventoryMovement)
      await tx.movement.create({
        data: {
          type: 'INGRESO',
          quantity,
          productId,
          toWarehouseId:warehouseId,
          userId
        }
      });

      return {
        previousStock,
        addedQuantity: quantity,
        newStock
      };
    });
  }

  static async registerOutbound(data: {
    productId: string;
    warehouseId: string;
    quantity: number;
    userId: string;
    type: MovementType; 
    reason?: AdjustmentReason;
    comment?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      // Verificar el stock actual
      const currentStock = await tx.stock.findUnique({
        where: { 
          productId_warehouseId: { 
            productId: data.productId, 
            warehouseId: data.warehouseId 
          } 
        }
      });

      if (!currentStock || Number(currentStock.quantity) < data.quantity) {
        throw new Error('Stock insuficiente para realizar esta salida');
      }

      // Restar la cantidad del stock en la bodega
      const updatedStock = await tx.stock.update({
        where: { 
          productId_warehouseId: { 
            productId: data.productId, 
            warehouseId: data.warehouseId 
          } 
        },
        data: { 
          quantity: { decrement: data.quantity } 
        }
      });

      // Registrar el movimiento histórico usando fromWarehouseId
      const movement = await tx.movement.create({
        data: {
          type: data.type,
          quantity: data.quantity,
          productId: data.productId,
          fromWarehouseId: data.warehouseId,
          userId: data.userId,
          reason: data.reason ?? null,
          comment: data.comment ?? null
        }
      });

      return { updatedStock, movement };
    });
  }

  static async deductStockAtomic(
    tx: Prisma.TransactionClient,
    warehouseId: string,
    items: { productId: string; quantity: number }[]
  ) {
    // Nota: Se asume que 'items' ya viene ordenado por productId para evitar deadlocks
    for (const item of items) {
      // El bloqueo FOR UPDATE ahora vive en el dominio que le corresponde
      const stocks = await tx.$queryRawUnsafe<Array<{ id: string; quantity: Prisma.Decimal }>>(
        'SELECT id, quantity FROM "Stock" WHERE "productId" = $1 AND "warehouseId" = $2 FOR UPDATE',
        item.productId,
        warehouseId
      );

      const stock = stocks[0];
      if (!stock || Number(stock.quantity) < item.quantity) {
        throw new Error(`Stock insuficiente para el producto con ID ${item.productId}`);
      }

      await tx.$queryRawUnsafe(
        'UPDATE "Stock" SET quantity = quantity - $1 WHERE id = $2',
        item.quantity,
        stock.id
      );
}
  }
}