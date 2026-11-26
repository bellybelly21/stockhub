import { API_URL } from '../config/api';

export interface DashboardData {
  kpis: {
    salesToday: number;
    salesChangePercent: number | null;
    transactionsToday: number;
    averageTicket: number;
    criticalProductsCount: number;
    inventoryValue: number;
    activeWarehousesCount: number;
  };
  salesLast7Days: { date: string; label: string; total: number }[];
  topProducts: { name: string; unitsSold: number }[];
  inventoryByWarehouse?: {
    warehouseName: string;
    totalValue: number;
    totalUnits?: number;
  }[];
  criticalAlerts: {
    stockId: string;
    productName: string;
    warehouseName: string;
    currentStock: number;
    criticalStock: number;
    deficit: number;
  }[];
  recentMovements: {
    id: string;
    type: string;
    productName: string;
    warehouseName: string;
    quantity: number;
    createdAt: string;
  }[];
}

export class DashboardService {
  static async getSummary(token: string): Promise<DashboardData> {
    const response = await fetch(`${API_URL}/api/dashboard/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || 'Error al cargar el dashboard');
    }
    return result.data;
  }
}