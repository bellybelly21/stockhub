import { Prisma } from '@prisma/client';
import { prisma } from '../db/client';
import { CreateSaleInput } from '../schemas/sale.schema';
import { ProductService } from './product.service';
import { StockService } from './stock.service';

export class SaleService {
  static async processSale(
    sellerId: string,
    warehouseId: string,
    data: CreateSaleInput,
    idempotencyKey: string
  ) {
    // Verificación de idempotencia fuera de la transacción para no bloquear recursos
    const existingSale = await prisma.sale.findUnique({
      where: { idempotencyKey },
      include: { details: true }
    });
    if (existingSale) return existingSale;

    // ORDENAMIENTO LÉXICO (Lock Ordering) para prevenir Deadlocks 40P01
    // Al bloquear las filas siempre en el mismo orden alfabético de IDs,
    // es matemáticamente imposible que dos transacciones se bloqueen mutuamente.
    const sortedItems = [...data.items].sort((a, b) => a.productId.localeCompare(b.productId));

    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          
          // Delegar validación de precios y estado al dominio de Producto
          const { validatedItems, totalAmount } = await ProductService.validateSaleItems(tx, sortedItems);

          // Delegar deducción de inventario al dominio de Stock (Escritura Atómica)
          await StockService.deductStockAtomic(tx, warehouseId, sortedItems);

          // Preparar movimientos históricos asociados a la venta
          const movements = validatedItems.map(item => ({
            type: 'VENTA' as const,
            quantity: item.quantity,
            userId: sellerId,
            productId: item.productId,
            fromWarehouseId: warehouseId,
          }));

          // Persistir la Venta, sus Detalles y los Movimientos
          return await tx.sale.create({
            data: {
              total: totalAmount,
              sellerId,
              warehouseId, 
              idempotencyKey,
              details: { create: validatedItems },
              movements: { create: movements },
            },
            include: { details: true },
          });

        });
      } catch (error: any) {
        if (error.code === '40P01' && attempt < MAX_RETRIES - 1) {
          attempt++;
          // Jitter aleatorio para desempatar hilos concurrentes
          await new Promise((res) => setTimeout(res, 50 + Math.random() * 100));
          continue;
        }
        throw error;
      }
    }
  }
}