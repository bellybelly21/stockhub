import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/client';
import { CreateSaleInput } from '../schemas/sale.schema';
import { ProductService } from './product.service';
import { StockService } from './stock.service';

export class SaleService {
  static async processSale(
    sellerId: string,
    warehouseId: number,
    data: CreateSaleInput,
    idempotencyKey: string
  ) {
    // ORDENAMIENTO LÉXICO para prevenir Deadlocks
    const sortedItems = [...data.items].sort((a, b) => a.productId - b.productId);
    // Calcular hash determinista del payload ordenado
    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ warehouseId, items: sortedItems }))
      .digest('hex');

    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        // Se añade timeout global de 2000ms
        const newSale = await prisma.$transaction(
          async (tx: Prisma.TransactionClient) => {
            await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '2s';`);
            const { validatedItems, totalAmount } = await ProductService.validateSaleItems(tx, sortedItems);

            // Delegar deducción de inventario al dominio de Stock
            await StockService.deductStockAtomic(tx, warehouseId, sortedItems);

            // Preparar movimientos históricos asociados a la venta
            const movements = validatedItems.map((item) => ({
              type: 'VENTA' as const,
              quantity: item.quantity,
              userId: sellerId,
              productId: item.productId,
              fromWarehouseId: warehouseId,
            }));

            // Persistir la Venta, sus detalles y los movimientos
            return await tx.sale.create({
              data: {
                total: totalAmount,
                sellerId,
                warehouseId,
                idempotencyKey,
                payloadHash,
                details: { create: validatedItems },
                movements: { create: movements },
              },
              include: { details: true },
            });
          },
          { timeout: 2000 }
        );

        return { sale: newSale, isReplay: false };

      } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const existingSale = await prisma.sale.findUnique({
            where: {
              sellerId_idempotencyKey: { sellerId, idempotencyKey },
            },
            include: { details: true },
          });

          if (existingSale) {
            if (existingSale.payloadHash !== payloadHash) {
              throw new Error('IDEMPOTENCY_PAYLOAD_MISMATCH');
            }
            return { sale: existingSale, isReplay: true };
          }
        }

        // Captura Deadlock (40P01), Serialization Failure (40001), Lock Timeout (55P03) 
        const pgErrorCode = error.code || error.meta?.code;
        const isTransientDbError = ['40P01', '40001', '55P03'].includes(pgErrorCode);
        const isStockConcurrency =
          typeof error.message === 'string' && error.message.startsWith('CONCURRENCY_ERROR');

        if (isTransientDbError || isStockConcurrency) {
          if (attempt < MAX_RETRIES - 1) {
            attempt++;
            // Jitter aleatorio (50-150ms) para desempatar hilos concurrentes
            await new Promise((res) => setTimeout(res, 50 + Math.random() * 100));
            continue;
          }
          // Al agotar los 3 intentos, escalar explícitamente para responder 503 Retry-After
          throw new Error('CONCURRENCY_EXHAUSTED: No se pudo completar la venta tras 3 intentos por alta concurrencia.');
        }

        throw error;
      }
    }

    throw new Error('CONCURRENCY_EXHAUSTED: No se pudo completar la venta por alta concurrencia.');
  }
}