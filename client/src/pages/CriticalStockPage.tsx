import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  TrendingDown,
  Warehouse as WarehouseIcon,
  AlertCircle,
} from 'lucide-react';
import { useAuth, API_URL } from '../context/AuthContext';

interface CriticalStockItem {
  stockId: string;
  productId: string;
  sku: string;
  productName: string;
  brand: string;
  unitOfMeasure: string;
  warehouseId: string;
  warehouseName: string;
  currentStock: number;
  criticalStock: number;
  deficit: number;
  relativeDeficit: number;
  urgency: 'ALTA' | 'MEDIA';
}

interface CriticalStockSummary {
  totalCriticalProducts: number;
  totalDeficitUnits: number;
  topDeficitWarehouse: {
    warehouseId: string;
    warehouseName: string;
    criticalCount: number;
    deficitUnits: number;
  } | null;
}

const formatNumber = (value: number) =>
  new Intl.NumberFormat('es-CL', { maximumFractionDigits: 3 }).format(value);

export default function CriticalStockPage() {
  const { accessToken } = useAuth();

  const [items, setItems] = useState<CriticalStockItem[]>([]);
  const [summary, setSummary] = useState<CriticalStockSummary>({
    totalCriticalProducts: 0,
    totalDeficitUnits: 0,
    topDeficitWarehouse: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCriticalStock = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/stock/critical`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar las alertas de stock crítico');
      }

      setItems(result.data?.items ?? []);
      setSummary(
        result.data?.summary ?? {
          totalCriticalProducts: 0,
          totalDeficitUnits: 0,
          topDeficitWarehouse: null,
        }
      );
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCriticalStock();
  }, []);

  const getUrgencyBadge = (urgency: 'ALTA' | 'MEDIA') => {
    if (urgency === 'ALTA') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600 whitespace-nowrap">
          Urgencia alta
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-600 whitespace-nowrap">
        Urgencia media
      </span>
    );
  };

  return (
    <section className="max-w-7xl mx-auto flex flex-col gap-6 mb-12 sm:px-0">
      {/* Header */}
      <header>
        <h1 className="text-2xl lg:text-3xl font-bold text-dark tracking-tight">
          Alertas de stock crítico
        </h1>
        <p className="text-slate-mid mt-1 text-sm">
          Productos ordenados por déficit más urgente
        </p>
      </header>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-danger text-sm font-medium flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchCriticalStock}
            className="underline text-xs hover:text-red-700 shrink-0"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* KPI 1: Productos críticos */}
        <div className="bg-white rounded-xl border border-red-300 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-mid">Productos críticos</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-red-600 leading-tight mt-0.5">
              {loading ? '—' : formatNumber(summary.totalCriticalProducts)}
            </p>
            <p className="text-xs text-slate-light mt-0.5">poco stock</p>
          </div>
        </div>

        {/* KPI 2: Déficit total */}
        <div className="bg-white rounded-xl border border-orange-300 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <TrendingDown size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-mid">Déficit total</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-orange-600 leading-tight mt-0.5">
              {loading ? '—' : formatNumber(summary.totalDeficitUnits)}
            </p>
            <p className="text-xs text-slate-light mt-0.5">unidades faltantes</p>
          </div>
        </div>

        {/* KPI 3: Mayor déficit por bodega */}
        <div className="bg-white rounded-xl border border-blue-300 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-primary flex items-center justify-center shrink-0">
            <WarehouseIcon size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-mid">Mayor déficit</p>
            <p className="text-lg sm:text-xl font-extrabold text-dark leading-tight mt-0.5 truncate">
              {loading
                ? '—'
                : summary.topDeficitWarehouse?.warehouseName || 'Sin alertas'}
            </p>
            <p className="text-xs text-slate-light mt-0.5">
              {loading
                ? 'Calculando...'
                : summary.topDeficitWarehouse
                ? `${summary.topDeficitWarehouse.criticalCount} ${
                    summary.topDeficitWarehouse.criticalCount === 1
                      ? 'producto crítico'
                      : 'productos críticos'
                  }`
                : 'Stock saludable'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabla de prioridades */}
      <div className="bg-white rounded-xl border border-light-gray overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-light-gray flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-sm sm:text-base font-bold text-dark">Tabla de prioridades</h2>
          <span className="text-xs text-slate-light">
            Los productos más urgentes aparecen primero
          </span>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-mid text-sm">Analizando inventario crítico...</p>
          </div>
        ) : items.length === 0 && !error ? (
          <div className="p-12 text-center text-slate-mid text-sm bg-white">
            No hay productos en estado crítico en este momento.
          </div>
        ) : (
          <>
            {/* Vista Desktop / Tablet */}
            <div className="overflow-x-auto w-full hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-light-gray">
                    <th className="py-3.5 px-6 text-[11px] font-bold text-slate-mid uppercase tracking-wider w-14">
                      #
                    </th>
                    <th className="py-3.5 px-4 text-[11px] font-bold text-slate-mid uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="py-3.5 px-4 text-[11px] font-bold text-slate-mid uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="py-3.5 px-4 text-[11px] font-bold text-slate-mid uppercase tracking-wider">
                      Bodega
                    </th>
                    <th className="py-3.5 px-4 text-[11px] font-bold text-slate-mid uppercase tracking-wider text-right">
                      Stock actual
                    </th>
                    <th className="py-3.5 px-4 text-[11px] font-bold text-slate-mid uppercase tracking-wider text-right">
                      Stock crítico
                    </th>
                    <th className="py-3.5 px-4 text-[11px] font-bold text-slate-mid uppercase tracking-wider text-right">
                      Déficit
                    </th>
                    <th className="py-3.5 px-6 text-[11px] font-bold text-slate-mid uppercase tracking-wider text-right">
                      Urgencia
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-gray bg-white text-sm">
                  {items.map((item, index) => {
                    const isHigh = item.urgency === 'ALTA';
                    return (
                      <tr
                        key={item.stockId}
                        className={`transition-colors ${
                          isHigh ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-4 px-6">
                          <span
                            className={`w-6 h-6 rounded-full text-xs font-bold text-white inline-flex items-center justify-center ${
                              isHigh ? 'bg-red-600' : 'bg-orange-500'
                            }`}
                          >
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-mid font-mono text-xs whitespace-nowrap">
                          {item.sku}
                        </td>
                        <td className="py-4 px-4 text-dark font-bold">{item.productName}</td>
                        <td className="py-4 px-4 text-slate-mid">{item.warehouseName}</td>
                        <td
                          className={`py-4 px-4 font-mono font-bold text-right ${
                            item.currentStock === 0 ? 'text-red-600' : 'text-orange-600'
                          }`}
                        >
                          {formatNumber(item.currentStock)}
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-mid text-right">
                          {formatNumber(item.criticalStock)}
                        </td>
                        <td
                          className={`py-4 px-4 font-mono font-bold text-right ${
                            isHigh ? 'text-red-600' : 'text-orange-600'
                          }`}
                        >
                          {formatNumber(item.deficit)}
                        </td>
                        <td className="py-4 px-6 text-right">
                          {getUrgencyBadge(item.urgency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Vista Mobile */}
            <div className="flex flex-col divide-y divide-light-gray bg-white md:hidden">
              {items.map((item, index) => {
                const isHigh = item.urgency === 'ALTA';
                return (
                  <div
                    key={item.stockId}
                    className={`p-4 flex flex-col gap-3 ${isHigh ? 'bg-red-50/40' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2 flex-row flex-wrap">
                      <div className="flex items-start gap-2.5 min-w-0  flex-row flex flex-wrap">
                        <span
                          className={`w-6 h-6 rounded-full text-xs font-bold text-white inline-flex items-center justify-center shrink-0 mt-0.5 ${
                            isHigh ? 'bg-red-600' : 'bg-orange-500'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-dark leading-tight break-words">
                            {item.productName}
                          </p>
                          <p className="text-xs text-slate-mid mt-1 font-mono">
                            {item.sku} • <span className="font-sans">{item.warehouseName}</span>
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0">{getUrgencyBadge(item.urgency)}</div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-light-gray text-center">
                      <div>
                        <p className="text-[10px] font-bold text-slate-light uppercase">Actual</p>
                        <p
                          className={`text-sm font-mono font-bold mt-0.5 ${
                            item.currentStock === 0 ? 'text-red-600' : 'text-orange-600'
                          }`}
                        >
                          {formatNumber(item.currentStock)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-light uppercase">Crítico</p>
                        <p className="text-sm font-mono font-semibold text-slate-mid mt-0.5">
                          {formatNumber(item.criticalStock)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-light uppercase">Déficit</p>
                        <p
                          className={`text-sm font-mono font-bold mt-0.5 ${
                            isHigh ? 'text-red-600' : 'text-orange-600'
                          }`}
                        >
                          {formatNumber(item.deficit)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}