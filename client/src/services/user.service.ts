import { API_URL } from '../config/api';
import type { Role } from '../types/user';

export interface CreateUserPayload {
  name: string;
  email: string;
  role: Role;
  rut?: string;
  assignedWarehouseId?: string;
  password?: string;
}

export interface UpdateUserPayload {
  name: string;
  email: string;
  role: Role;
  assignedWarehouseId?: string;
  password?: string;
}

export class UserService {
  private static authHeaders(token: string) {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  static async create(token: string, payload: CreateUserPayload) {
    const response = await fetch(`${API_URL}/api/users`, {
      method: 'POST',
      headers: this.authHeaders(token),
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      throw new Error(data.error || 'Error en la operación');
    }
    return data;
  }

  static async update(token: string, id: string, payload: UpdateUserPayload) {
    const response = await fetch(`${API_URL}/api/users/${id}`, {
      method: 'PATCH',
      headers: this.authHeaders(token),
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      throw new Error(data.error || 'Error en la operación');
    }
    return data;
  }
  static async getAll<T = any>(token: string): Promise<T[]> {
    const response = await fetch(`${API_URL}/api/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      throw new Error(data.error || 'Error al cargar usuarios');
    }
    return Array.isArray(data?.data) ? data.data : [];
  }

  static async toggleStatus<T = any>(token: string, id: string): Promise<T> {
    const response = await fetch(`${API_URL}/api/users/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      throw new Error(data.error || 'No se pudo cambiar el estado');
    }
    return data.data;
  }
}