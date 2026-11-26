import { API_URL } from '../config/api';
import type { RefreshAuthResponse } from '../types/auth';

const CSRF_HEADERS = {
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
};

export class AuthService {
  static async refresh(): Promise<RefreshAuthResponse> {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: CSRF_HEADERS,
      credentials: 'include',
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false };
    }
    return data as RefreshAuthResponse;
  }

  static async logout(): Promise<void> {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: CSRF_HEADERS,
      credentials: 'include',
    });
  }
}