import { API_URL } from '../config/api';

export type ReportType = 'stock' | 'sales' | 'sellers';

export interface DateRange {
  from: string;
  to: string;
}

export class ReportService {
  static async downloadExcel(
    token: string,
    type: ReportType,
    range?: DateRange
  ): Promise<{ blob: Blob; filename: string }> {
    const params =
      type === 'stock' || !range
        ? ''
        : `?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;

    const response = await fetch(`${API_URL}/api/reports/${type}${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'No se pudo generar el reporte');
    }

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition');
    const match = disposition?.match(/filename="(.+)"/);
    const filename = match?.[1] ?? `reporte-${type}.xlsx`;

    return { blob, filename };
  }
}