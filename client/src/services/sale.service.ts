import { API_URL } from '../config/api';

export interface SaleItemPayload {
  productId: number;
  quantity: number;
  expectedPrice: number;
}

export interface CreateSalePayload {
  items: SaleItemPayload[];
}

export class SaleService {
  static async createSale(
    token: string,
    payload: CreateSalePayload,
    idempotencyKey: string
  ) {
    const response = await fetch(`${API_URL}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Error al procesar la venta');
    }

    return data;
  }
}