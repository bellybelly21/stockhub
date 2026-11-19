import { prisma } from '../db/client';
import { MovementType, AdjustmentReason, Prisma } from '@prisma/client';

export class StockService {
  static async addStock({ productId, warehouseId, quantity, userId }: { productId: string; warehouseId: string; quantity: number; userId: string }) {
    return await prisma.$transaction(async (tx) => {
      const existingStock = await tx.stock.findUnique({
        where: {
          productId_warehouseId: { productId, warehouseId }
        }
      });

      const previousStock = existingStock ? Number(existingStock.quantity) : 0;
      const newStock = previousStock + quantity;

      await tx.stock.upsert({
        where: {
          productId_warehouseId: { productId, warehouseId }
        },
        update: {
          quantity: { increment: quantity },
          version: { increment: 1 } // Mantener la versión actualizada en ingresos
        },
        create: {
          productId,
          warehouseId,
          quantity,
          version: 1 // Iniciar versión en 1
        }
      });

      await tx.movement.create({
        data: {
          type: 'INGRESO',
          quantity,
          productId,
          toWarehouseId: warehouseId,
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
      // Leer el estado actual del stock
      const currentStockRecord = await tx.stock.findUnique({
        where: {
          productId_warehouseId: { productId: data.productId, warehouseId: data.warehouseId }
        }
      });

      if (!currentStockRecord) {
        throw new Error('Stock no encontrado para realizar esta salida');
      }

      const currentStock = new Prisma.Decimal(currentStockRecord.quantity);
      const deductQuantity = new Prisma.Decimal(data.quantity);

      if (currentStock.lt(deductQuantity)) {
        throw new Error('Stock insuficiente para realizar esta salida');
      }

      // Actualización Segura
      const updateResult = await tx.stock.updateMany({
        where: { 
          id: currentStockRecord.id,
          version: currentStockRecord.version
        },
        data: { 
          quantity: currentStock.minus(deductQuantity),
          version: { increment: 1 } // Incrementamos la versión
        }
      });

      // Validar si otro hilo modificó el stock entre el paso 1 y el paso 2
      if (updateResult.count === 0) {
        // Lanzamos un error específico para que el controlador devuelva un HTTP 409
        throw new Error('CONCURRENCY_ERROR: El stock fue modificado por otra transacción. Reintente la operación.');
      }

      const movement = await tx.movement.create({
        data: {
          type: data.type,
          quantity: deductQuantity,
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
      // Consultar sin bloquear la tabla
      const stock = await tx.stock.findUnique({
        where: {
          productId_warehouseId: { productId: item.productId, warehouseId }
        }
      });

      if (!stock || Number(stock.quantity) < item.quantity) {
        throw new Error(`Stock insuficiente para el producto con ID ${item.productId}`);
      }

      // Descontar aplicando Bloqueo Optimista
      const result = await tx.stock.updateMany({
        where: {
          id: stock.id,
          version: stock.version
        },
        data: {
          quantity: { decrement: item.quantity },
          version: { increment: 1 }
        }
      });

      // Verificar concurrencia
      if (result.count === 0) {
        throw new Error(`CONCURRENCY_ERROR: El stock del producto ${item.productId} cambió durante la venta. Reintente.`);
      }
    }
  }
}