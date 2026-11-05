import type { GlobalInventoryApiResponse, WarehousesApiResponse } from '../types/inventory';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/';

export class InventoryService {
  static async getGlobalInventory(token: string, params?: {
    warehouseId?: string;
    status?: string;
    search?: string;
  }): Promise<GlobalInventoryApiResponse> {
    const queryParams = new URLSearchParams();
    if (params?.warehouseId && params.warehouseId !== 'Todas') {
      queryParams.append('warehouseId', params.warehouseId);
    }
    if (params?.status && params.status !== 'Todos') {
      queryParams.append('status', params.status);
    }
    if (params?.search && params.search.trim() !== '') {
      queryParams.append('search', params.search.trim());
    }

    const response = await fetch(`${API_BASE_URL}/api/stock/global?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include', // HttpOnly Cookies para JWT/Refresh Token
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al obtener el inventario');
    }

    return response.json();
  }

  static async getActiveWarehouses(token:string): Promise<WarehousesApiResponse> {
    const response = await fetch(`${API_BASE_URL}/api/warehouses`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Error al obtener las bodegas');
    }

    return response.json();
  }
}