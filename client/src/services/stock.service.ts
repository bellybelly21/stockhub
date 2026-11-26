import { API_URL } from '../config/api';

export interface RegisterStockEntryPayload {
  productId: number;
  warehouseId: number;
  quantity: number;
}

export interface StockEntryApiResponse {
  previousStock?: number;
  newStock?: number;
  data?: {
    previousStock?: number;
    newStock?: number;
  };
}

export class StockService {
  static async registerEntry(
    token: string,
    payload: RegisterStockEntryPayload
  ): Promise<StockEntryApiResponse> {
    const response = await fetch(`${API_URL}/api/stock/entry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        productId: Number(payload.productId),
        warehouseId: Number(payload.warehouseId),
        quantity: Number(payload.quantity),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Error al registrar la entrada de mercancía.');
    }
    return data;
  }
}