import { API_URL } from '../config/api';

export interface ProductPayload {
  sku: string;
  barcode: string;
  name: string;
  brand: string;
  supplier: string;
  unitOfMeasure: string;
  status: string;
  basePrice: number;
  criticalStock: number;
  weight?: number;
  volume?: number;
}

export class ProductService {
  private static authHeaders(token: string) {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  static async getById(token: string, id: number | string) {
    const response = await fetch(`${API_URL}/api/products/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || 'Error al cargar el producto');
    }
    return result.data;
  }

  static async create(token: string, payload: ProductPayload) {
    const response = await fetch(`${API_URL}/api/products`, {
      method: 'POST',
      headers: this.authHeaders(token),
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(this.formatError(data, 'Error al guardar los datos.'));
    }
    return data;
  }

  static async update(token: string, id: number | string, payload: Partial<ProductPayload>) {
    const response = await fetch(`${API_URL}/api/products/${id}`, {
      method: 'PATCH',
      headers: this.authHeaders(token),
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(this.formatError(data, 'Error al guardar los datos.'));
    }
    return data;
  }

  static async getAll<T = any>(token: string): Promise<T[]> {
    const response = await fetch(`${API_URL}/api/products`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Error al cargar los productos');
    }

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.products)) return data.products;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }

  static async searchByCode<T = any>(
    token: string,
    code: string,
    warehouseId?: number | string
  ): Promise<T> {
    const params = new URLSearchParams({ code: code.trim() });
    if (warehouseId !== undefined && warehouseId !== null && warehouseId !== '') {
      params.append('warehouseId', String(warehouseId));
    }

    const response = await fetch(`${API_URL}/api/products/search?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Producto no encontrado. Verifique el código ingresado.');
    }

    const foundProduct = data.product || data.data || data;
    if (!foundProduct || !foundProduct.id) {
      throw new Error('Producto no encontrado en la base de datos.');
    }
    return foundProduct;
  }

  static async updateStatus(token: string, id: number | string, status: string) {
    const response = await fetch(`${API_URL}/api/products/${id}`, {
      method: 'PATCH',
      headers: this.authHeaders(token),
      body: JSON.stringify({ status }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Error al actualizar el estado');
    }
    return data;
  }

  static async getByWarehouse<T = any>(
    token: string,
    warehouseId: number | string,
    limit = 100
  ): Promise<T[]> {
    const params = new URLSearchParams({
      limit: String(limit),
      warehouseId: String(warehouseId),
    });

    const response = await fetch(`${API_URL}/api/products?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Error al cargar catálogo');
    }

    return Array.isArray(data?.data) ? data.data : [];
  }

  private static formatError(data: any, fallback: string): string {
    if (Array.isArray(data?.details)) {
      const zodErrors = data.details
        .map((err: any) => `${err.campo}: ${err.mensaje}`)
        .join(' | ');
      return `Datos inválidos: ${zodErrors}`;
    }
    if (Array.isArray(data?.errors)) {
      const zodErrors = data.errors
        .map((err: any) => `${err.path}: ${err.message}`)
        .join(' | ');
      return `Datos inválidos: ${zodErrors}`;
    }
    return data?.error || data?.message || fallback;
  }
}