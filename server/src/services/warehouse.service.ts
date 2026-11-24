import { Prisma, Role } from '@prisma/client';
import { prisma } from '../db/client';
import { CreateWarehouseInput } from '../schemas/warehouse.schema';

interface ActorContext {
  role: Role;
  assignedWarehouseId: string | null;
}

export class WarehouseService {
  static async getActiveWarehouses(actor: ActorContext) {
    if (actor.role === 'VENDEDOR' && !actor.assignedWarehouseId) {
      return [];
    }

    const where: Prisma.WarehouseWhereInput = {
      isActive: true,
      ...(actor.role === 'VENDEDOR' && actor.assignedWarehouseId
        ? { id: actor.assignedWarehouseId }
        : {}),
    };

    const warehouses = await prisma.warehouse.findMany({
      where,
      select: {
        id: true,
        name: true,
        location: true,
        stocks: {
          where: { quantity: { gt: 0 } },
          select: {
            quantity: true,
            product: {
              select: { basePrice: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return warehouses.map((w) => {
      let totalUnits = 0;
      let totalValue = 0;

      for (const stock of w.stocks) {
        const qty = Number(stock.quantity);
        const price = Number(stock.product.basePrice);
        totalUnits += qty;
        totalValue += qty * price;
      }

      return {
        id: w.id,
        name: w.name,
        location: w.location,
        totalProducts: w.stocks.length,
        totalUnits: Number(totalUnits.toFixed(3)),
        totalValue: Math.round(totalValue),
      };
    });
  }

  static async createWarehouse(input: CreateWarehouseInput) {
    try {
      return await prisma.warehouse.create({
        data: {
          name: input.name,
          location: input.location ?? null,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await prisma.warehouse.findUnique({
          where: { name: input.name },
          select: { isActive: true },
        });

        if (existing && !existing.isActive) {
          throw new Error('WAREHOUSE_EXISTS_INACTIVE');
        }
        throw new Error('WAREHOUSE_ALREADY_EXISTS');
      }
      throw error;
    }
  }
}