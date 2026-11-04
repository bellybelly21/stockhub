import { Prisma } from '@prisma/client';
import { prisma } from '../db/client';
import { CreateSaleInput } from '../schemas/sale.schema';

export class SaleService {
  static async processSale(
    sellerId: string,
    warehouseId: string,
    data: CreateSaleInput,
    idempotencyKey: string
  ) {
    // 1. Verificar si esta petición ya se procesó con éxito
    const existingSale = await prisma.sale.findUnique({
      where: { idempotencyKey },
      include: { details: true }
    });
    if (existingSale) return existingSale;

    const MAX_RETRIES = 3;
    let attempt = 0;

    // 2. Bucle de reintentos para manejar Deadlocks de PostgreSQL
    while (attempt < MAX_RETRIES) {
      try {
        return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          let totalSale = new Prisma.Decimal(0);
          const saleDetails = [];
          const movements = [];

          // 3. Inicio del bucle sobre cada item de la venta
          for (const item of data.items) {
            
            // Obtener el producto para validar el precio
            const product = await tx.product.findUnique({
              where: { id: item.productId }
            });

            if (!product) {
              throw new Error(`Producto no encontrado: ${item.productId}`);
            }

            // Verificar discrepancia de precios
            if (Number(product.basePrice) !== item.expectedPrice) {
              throw new Error(`Mapeo de precio fallido para ${product.name}. Precio actual es ${product.basePrice}`);
            }

            // Bloqueo de fila para concurrencia extrema (FOR UPDATE)
            const stocks = await tx.$queryRawUnsafe<Array<{ id: string; quantity: Prisma.Decimal }>>(
              'SELECT id, quantity FROM "Stock" WHERE "productId" = $1 AND "warehouseId" = $2 FOR UPDATE',
              item.productId,
              warehouseId
            );

            // Validar stock disponible
            const stock = stocks[0];
            if (!stock || Number(stock.quantity) < item.quantity) {
              throw new Error(`Stock insuficiente para el producto ${product.name}`);
            }

            // Actualizar stock atómicamente con raw query
            await tx.$queryRawUnsafe(
              'UPDATE "Stock" SET quantity = quantity - $1 WHERE id = $2',
              item.quantity,
              stock.id
            );

            // Calcular subtotales
            const itemQuantity = new Prisma.Decimal(item.quantity);
            const subtotal = itemQuantity.mul(product.basePrice);
            totalSale = totalSale.add(subtotal);

            // Preparar arrays de detalles y movimientos
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

          // 4. Crear la Venta, Detalles y Movimientos en una sola operación
          return await tx.sale.create({
            data: {
              total: totalSale,
              sellerId,
              warehouseId, 
              idempotencyKey,
              details: { create: saleDetails },
              movements: { create: movements },
            },
            include: { details: true },
          });
        });
      } catch (error: any) {
        // Manejo del Deadlock
        if (error.code === '40P01' && attempt < MAX_RETRIES - 1) {
          attempt++;
          // Espera aleatoria entre 50ms y 150ms para desempatar transacciones
          await new Promise((res) => setTimeout(res, 50 + Math.random() * 100));
          continue;
        }
        // Si no es un deadlock o superamos los reintentos, lanzamos el error al Controller
        throw error;
      }
    }
  }
}