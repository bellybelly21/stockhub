import { prisma } from '../db/client';
import { MovementType, AdjustmentReason, Prisma } from '@prisma/client';

export class StockService {
  /**
   * Método atómico único para descontar stock usando OCC + validación en BD.
   * Puede recibir una transacción existente (tx) para operaciones compuestas.
   */
  static async decrementAtomic(
    tx: Prisma.TransactionClient,
    productId: string,
    warehouseId: string,
    quantity: Prisma.Decimal | number
  ) {
    const deductQty = new Prisma.Decimal(quantity);

    const stock = await tx.stock.findUnique({
      where: {
        productId_warehouseId: { productId, warehouseId }
      }
    });

    if (!stock || new Prisma.Decimal(stock.quantity).lt(deductQty)) {
      const available = stock ? stock.quantity.toString() : '0';
      throw new Error(`INSUFFICIENT_STOCK:${available}`);
    }

    const result = await tx.stock.updateMany({
      where: {
        id: stock.id,
        version: stock.version,
        quantity: { gte: deductQty } // Blindaje atómico en PostgreSQL
      },
      data: {
        quantity: { decrement: deductQty },
        version: { increment: 1 } // Mantiene sincronizado el OCC
      }
    });

    if (result.count === 0) {
      throw new Error('CONCURRENCY_ERROR: El stock fue modificado por otra transacción. Reintente.');
    }

    return stock;
  }

  /**
   * Método atómico para incrementar stock manteniendo el versionado.
   */
  static async incrementAtomic(
    tx: Prisma.TransactionClient,
    productId: string,
    warehouseId: string,
    quantity: Prisma.Decimal | number
  ) {
    const addQty = new Prisma.Decimal(quantity);

    return await tx.stock.upsert({
      where: { productId_warehouseId: { productId, warehouseId } },
      update: {
        quantity: { increment: addQty },
        version: { increment: 1 }
      },
      create: {
        productId,
        warehouseId,
        quantity: addQty,
        version: 1
      }
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
      await this.decrementAtomic(tx, data.productId, data.warehouseId, data.quantity);

      const movement = await tx.movement.create({
        data: {
          type: data.type,
          quantity: new Prisma.Decimal(data.quantity),
          productId: data.productId,
          fromWarehouseId: data.warehouseId,
          userId: data.userId,
          reason: data.reason ?? null,
          comment: data.comment ?? null
        }
      });

      return { movement };
    });
  }

  static async deductStockAtomic(
    tx: Prisma.TransactionClient,
    warehouseId: string,
    items: { productId: string; quantity: number }[]
  ) {
    for (const item of items) {
      await this.decrementAtomic(tx, item.productId, warehouseId, item.quantity);
    }
  }

  static async addStock(data: {
    productId: string;
    warehouseId: string;
    quantity: number;
    userId: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      const existingStock = await tx.stock.findUnique({
        where: {
          productId_warehouseId: { productId: data.productId, warehouseId: data.warehouseId }
        }
      });
      const previousStock = existingStock ? Number(existingStock.quantity) : 0;

      const updatedStock = await this.incrementAtomic(
        tx, 
        data.productId, 
        data.warehouseId, 
        data.quantity
      );

      await tx.movement.create({
        data: {
          type: 'INGRESO',
          quantity: new Prisma.Decimal(data.quantity),
          productId: data.productId,
          toWarehouseId: data.warehouseId,
          userId: data.userId
        }
      });

      return {
        previousStock,
        addedQuantity: data.quantity,
        newStock: Number(updatedStock.quantity)
      };
    });
  }
}