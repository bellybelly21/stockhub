import { prisma } from '../db/client';

const CHILE_TZ = 'America/Santiago';

// Devuelve 'YYYY-MM-DD' en hora exacta de Chile
function getChileDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CHILE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// Devuelve etiqueta corta del día ('Lun', 'Mar', 'Mié'...)
function getChileDayLabel(date: Date): string {
  const raw = new Intl.DateTimeFormat('es-CL', {
    timeZone: CHILE_TZ,
    weekday: 'short',
  }).format(date);
  const clean = raw.replace('.', '');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export class DashboardService {
  static async getAdminSummary() {
    const now = new Date();
    const todayKey = getChileDateKey(now);

    const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayKey = getChileDateKey(yesterdayDate);

    // Margen de 8 días para cubrir los últimos 7 días en hora Chile sin cortes por UTC
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      recentSales,
      saleDetails30d,
      stocks,
      activeWarehousesCount,
      recentMovements,
    ] = await Promise.all([
      prisma.sale.findMany({
        where: {
          createdAt: { gte: eightDaysAgo },
          taxStatus: { not: 'ANULADO' },
        },
        select: {
          total: true,
          createdAt: true,
        },
      }),

      prisma.saleDetail.findMany({
        where: {
          sale: {
            createdAt: { gte: thirtyDaysAgo },
            taxStatus: { not: 'ANULADO' },
          },
        },
        select: {
          productId: true,
          quantity: true,
          returnedQuantity: true,
          product: {
            select: { name: true },
          },
        },
      }),

      prisma.stock.findMany({
        where: {
          warehouse: { isActive: true },
          product: { status: { not: 'INACTIVO' } },
        },
        select: {
          id: true,
          quantity: true,
          product: {
            select: {
              id: true,
              name: true,
              basePrice: true,
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
      }),

      prisma.warehouse.count({
        where: { isActive: true },
      }),

      prisma.movement.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          quantity: true,
          createdAt: true,
          product: { select: { name: true } },
          fromWarehouse: { select: { name: true } },
          toWarehouse: { select: { name: true } },
        },
      }),
    ]);

    // Ventas por día (últimos 7 días en hora Chile)
    const salesByDay = new Map<string, { total: number; count: number }>();
    for (const sale of recentSales) {
      const key = getChileDateKey(sale.createdAt);
      const prev = salesByDay.get(key) ?? { total: 0, count: 0 };
      prev.total += Number(sale.total);
      prev.count += 1;
      salesByDay.set(key, prev);
    }

    const todayStats = salesByDay.get(todayKey) ?? { total: 0, count: 0 };
    const yesterdayStats = salesByDay.get(yesterdayKey) ?? { total: 0, count: 0 };

    const averageTicket =
      todayStats.count > 0 ? Math.round(todayStats.total / todayStats.count) : 0;

    let salesChangePercent: number | null = null;
    if (yesterdayStats.total > 0) {
      salesChangePercent = Math.round(
        ((todayStats.total - yesterdayStats.total) / yesterdayStats.total) * 100
      );
    } else if (todayStats.total > 0) {
      salesChangePercent = 100;
    }

    const salesLast7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = getChileDateKey(d);
      salesLast7Days.push({
        date: key,
        label: getChileDayLabel(d),
        total: Math.round(salesByDay.get(key)?.total ?? 0),
      });
    }

    // Top 5 productos más vendidos (últimos 30 días)
    const productSalesMap = new Map<string, { name: string; unitsSold: number }>();
    for (const detail of saleDetails30d) {
      const netQty = Number(detail.quantity) - Number(detail.returnedQuantity);
      if (netQty <= 0) continue;
      const prev = productSalesMap.get(detail.productId) ?? {
        name: detail.product.name,
        unitsSold: 0,
      };
      prev.unitsSold += netQty;
      productSalesMap.set(detail.productId, prev);
    }

    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5)
      .map((p) => ({
        name: p.name,
        unitsSold: Number(p.unitsSold.toFixed(3)),
      }));

    // Valor de inventario, distribución por bodega y alertas críticas
    let inventoryValue = 0;
    const criticalList = [];
    const warehouseMap = new Map<string, { warehouseName: string; totalValue: number }>();

    for (const s of stocks) {
      const qty = Number(s.quantity);
      const price = Number(s.product.basePrice);
      const critical = Number(s.product.criticalStock);

      if (qty > 0) {
        const stockValue = qty * price;
        inventoryValue += stockValue;

        const prev = warehouseMap.get(s.warehouse.id) ?? {
          warehouseName: s.warehouse.name,
          totalValue: 0,
        };
        prev.totalValue += stockValue;
        warehouseMap.set(s.warehouse.id, prev);
      }

      if (qty <= critical) {
        const deficit = Number((qty - critical).toFixed(3));
        const relativeDeficit = critical > 0 ? deficit / critical : qty === 0 ? -1 : 0;
        criticalList.push({
          stockId: s.id,
          productName: s.product.name,
          warehouseName: s.warehouse.name,
          currentStock: qty,
          criticalStock: critical,
          deficit,
          relativeDeficit,
        });
      }
    }

    const inventoryByWarehouse = Array.from(warehouseMap.values())
      .map((w) => ({
        warehouseName: w.warehouseName,
        totalValue: Math.round(w.totalValue),
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    criticalList.sort(
      (a, b) => a.relativeDeficit - b.relativeDeficit || a.deficit - b.deficit
    );

    // Formatear movimientos recientes
    const formattedMovements = recentMovements.map((m) => ({
      id: m.id,
      type: m.type,
      productName: m.product.name,
      warehouseName: m.toWarehouse?.name || m.fromWarehouse?.name || 'Sin bodega',
      quantity: Number(m.quantity),
      createdAt: m.createdAt,
    }));

    return {
      kpis: {
        salesToday: Math.round(todayStats.total),
        salesChangePercent,
        transactionsToday: todayStats.count,
        averageTicket,
        criticalProductsCount: criticalList.length,
        inventoryValue: Math.round(inventoryValue),
        activeWarehousesCount,
      },
      salesLast7Days,
      topProducts,
      inventoryByWarehouse,
      criticalAlerts: criticalList.slice(0, 4),
      recentMovements: formattedMovements,
    };
  }
}