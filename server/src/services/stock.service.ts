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

  static async getCriticalStock(warehouseId?: string) {
    const stocks = await prisma.stock.findMany({
      where: {
        ...(warehouseId ? { warehouseId } : {}),
        warehouse: { isActive: true },
        product: { status: { not: 'INACTIVO' } },
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            brand: true,
            unitOfMeasure: true,
            criticalStock: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Filtrar stock_actual <= stock_critico y calcular déficit
    const criticalItems = stocks
      .map((s) => {
        const currentStock = Number(s.quantity);
        const criticalStock = Number(s.product.criticalStock);
        const deficit = Number((currentStock - criticalStock).toFixed(3)); // Negativo o 0
        const relativeDeficit =
          criticalStock > 0 ? deficit / criticalStock : currentStock === 0 ? -1 : 0;

        // Urgencia alta si está agotado (0) o le falta >= 50% del stock crítico
        const urgency: 'ALTA' | 'MEDIA' =
          currentStock === 0 || relativeDeficit <= -0.5 ? 'ALTA' : 'MEDIA';

        return {
          stockId: s.id,
          productId: s.product.id,
          sku: s.product.sku,
          productName: s.product.name,
          brand: s.product.brand,
          unitOfMeasure: s.product.unitOfMeasure,
          warehouseId: s.warehouse.id,
          warehouseName: s.warehouse.name,
          currentStock,
          criticalStock,
          deficit,
          relativeDeficit: Number(relativeDeficit.toFixed(4)),
          urgency,
        };
      })
      .filter((item) => item.currentStock <= item.criticalStock)
      // Ordenar por mayor déficit relativo (más negativo primero); desempate por déficit absoluto
      .sort((a, b) => a.relativeDeficit - b.relativeDeficit || a.deficit - b.deficit);

    // Calcular KPIs superiores
    const totalCriticalProducts = criticalItems.length;
    const totalDeficitUnits = Number(
      criticalItems.reduce((acc, item) => acc + Math.abs(item.deficit), 0).toFixed(3)
    );

    // Agrupar por bodega para identificar la de mayor déficit
    const warehouseStats = new Map<
      string,
      { warehouseId: string; warehouseName: string; criticalCount: number; deficitUnits: number }
    >();

    for (const item of criticalItems) {
      const prev = warehouseStats.get(item.warehouseId) ?? {
        warehouseId: item.warehouseId,
        warehouseName: item.warehouseName,
        criticalCount: 0,
        deficitUnits: 0,
      };
      prev.criticalCount += 1;
      prev.deficitUnits += Math.abs(item.deficit);
      warehouseStats.set(item.warehouseId, prev);
    }

    const topDeficitWarehouse =
      Array.from(warehouseStats.values()).sort(
        (a, b) => b.deficitUnits - a.deficitUnits || b.criticalCount - a.criticalCount
      )[0] ?? null;

    return {
      summary: {
        totalCriticalProducts,
        totalDeficitUnits,
        topDeficitWarehouse,
      },
      items: criticalItems,
    };
  }
}