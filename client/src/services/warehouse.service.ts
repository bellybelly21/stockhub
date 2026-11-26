import { API_URL } from '../config/api';
import type { WarehousesApiResponse } from '../types/inventory';

export interface CreateWarehousePayload {
  name: string;
  location?: string;
}

export class WarehouseService {
  static async getActive(token: string): Promise<WarehousesApiResponse> {
    const response = await fetch(`${API_URL}/api/warehouses`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Error al obtener las bodegas');
    }
    return data;
  }

  static async create(token: string, payload: CreateWarehousePayload) {
    const response = await fetch(`${API_URL}/api/warehouses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const zodDetail = data.details?.[0]?.mensaje;
      throw new Error(zodDetail || data.error || data.message || 'Error al crear la bodega.');
    }
    return data;
  }
}