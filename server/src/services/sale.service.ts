import { prisma } from '../db/client';
import { MovementType } from '@prisma/client';

interface SaleItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export const registerSale = async (sellerId: string, warehouseId: string, items: SaleItem[]) => {
  // Se ejecuta todo o no se ejecuta nada (Rollback automático)
  return await prisma.$transaction(async (tx: { stock: { findUnique: (arg0: { where: { productId_warehouseId: { productId: string; warehouseId: string; }; }; }) => any; update: (arg0: { where: { productId_warehouseId: { productId: string; warehouseId: string; }; }; data: { quantity: { decrement: number; }; }; }) => any; }; sale: { create: (arg0: { data: { total: number; sellerId: string; details: { create: { productId: string; warehouseId: string; quantity: number; unitPrice: number; subtotal: number; }[]; }; }; }) => any; }; movement: { create: (arg0: { data: { type: any; quantity: number; userId: string; productId: string; fromWarehouseId: string; saleId: any; }; }) => any; }; }) => {
    let totalSale = 0;

    // 1. Verificar stock y calcular total
    for (const item of items) {
      const stock = await tx.stock.findUnique({
        where: {
          productId_warehouseId: { productId: item.productId, warehouseId }
        }
      });

      if (!stock || Number(stock.quantity) < item.quantity) {
        throw new Error(`Stock insuficiente para el producto ${item.productId}`);
      }

      totalSale += item.quantity * item.unitPrice;
    }

    // 2. Crear cabecera de la venta
    const sale = await tx.sale.create({
      data: {
        total: totalSale,
        sellerId,
        details: {
          create: items.map(item => ({
            productId: item.productId,
            warehouseId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.quantity * item.unitPrice
          }))
        }
      }
    });

    // 3. Descontar stock y registrar movimientos (Auditoría inmutable)
    for (const item of items) {
      // Actualización atómica de existencias
      await tx.stock.update({
        where: { productId_warehouseId: { productId: item.productId, warehouseId } },
        data: { quantity: { decrement: item.quantity } }
      });

      // Registro inmutable del movimiento
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