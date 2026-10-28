import { Prisma } from '@prisma/client';
import { prisma } from '../db/client';
import { CreateSaleInput } from '../schemas/sale.schema';

export class SaleService {
  static async processSale(sellerId: string, warehouseId: string, data: CreateSaleInput) {
    return await prisma.$transaction(async (tx:Prisma.TransactionClient) => {
      let totalSale = new Prisma.Decimal(0); 
      const saleDetails = [];
      const movements = [];

      for (const item of data.items) {
        // Bloqueo de fila
        const stocks = await tx.$queryRawUnsafe<Array<{ id: string; quantity: Prisma.Decimal }>>(
          'SELECT id, quantity FROM "Stock" WHERE "productId" = $1 AND "warehouseId" = $2 FOR UPDATE',
          item.productId,
          warehouseId
        );

        // Extracción segura para satisfacer a TypeScript
        const stock = stocks[0];

        if (!stock || Number(stock.quantity) < item.quantity) {
          throw new Error(`Stock insuficiente para el producto ID: ${item.productId}`);
        }

        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || product.status !== 'ACTIVO') {
          throw new Error(`El producto ${item.productId} no está activo.`);
        }

        const itemQuantity = new Prisma.Decimal(item.quantity);
        const subtotal = itemQuantity.mul(product.basePrice);
        totalSale = totalSale.add(subtotal);

        // Usamos stock.id de la variable ya validada
        await tx.stock.update({
          where: { id: stock.id },
          data: { quantity: { decrement: item.quantity } },
        });

        saleDetails.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.basePrice,
          subtotal: subtotal,
        });

        movements.push({
          type: 'VENTA' as const,
          quantity: item.quantity,
          userId: sellerId,
          productId: item.productId,
          fromWarehouseId: warehouseId,
        });
      }

      return await tx.sale.create({
        data: {
          total: totalSale,
          sellerId,
          warehouseId,
          details: { create: saleDetails },
          movements: { create: movements },
        },
        include: { details: true },
      });
    });
  }
}