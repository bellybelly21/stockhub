import { prisma } from '../db/client';
import { MovementType, Prisma } from '@prisma/client';

interface SaleItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export const registerSale = async (sellerId: string, warehouseId: string, items: SaleItem[]) => {
  return await prisma.$transaction(async (tx) => {
    let totalSale = new Prisma.Decimal(0);

    for (const item of items) {
      // Bloqueo de fila estricto para concurrencia real
      const stocks = await tx.$queryRaw<{ quantity: Prisma.Decimal }[]>`
        SELECT quantity FROM "Stock" 
        WHERE "productId" = ${item.productId} 
          AND "warehouseId" = ${warehouseId} 
        FOR UPDATE
      `;

      if (!stocks[0] || Number(stocks[0].quantity) < item.quantity) {
        throw new Error(`Stock insuficiente para el producto ${item.productId}`);
      }

      // Cálculo matemático
      const itemSubtotal = new Prisma.Decimal(item.quantity).mul(item.unitPrice);
      totalSale = totalSale.add(itemSubtotal);
    }

    const sale = await tx.sale.create({
      data: {
        total: totalSale,
        sellerId,
        warehouseId,
        details: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: new Prisma.Decimal(item.quantity).mul(item.unitPrice)
          }))
        }
      }
    });

    // Descontar stock y registrar movimientos
    for (const item of items) {
      await tx.stock.update({
        where: { productId_warehouseId: { productId: item.productId, warehouseId } },
        data: { quantity: { decrement: item.quantity } }
      });

      await tx.movement.create({
        data: {
          type: MovementType.VENTA,
          quantity: item.quantity,
          userId: sellerId,
          productId: item.productId,
          fromWarehouseId: warehouseId,
          saleId: sale.id
        }
      });
    }

    return sale;
  });
};