import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Legend,
  Tooltip,
  Filler,
  type ChartOptions,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Package,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useAuth, API_URL } from '../context/AuthContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Legend,
  Tooltip,
  Filler
);

interface DashboardData {
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

const formatCLP = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat('es-CL', { maximumFractionDigits: 3 }).format(value);

const formatTimeChile = (isoDate: string) =>
  new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate));

const WAREHOUSE_COLORS = [
  '#2563EB',
  '#10B981',
  '#8B5CF6',
  '#F59E0B',
  '#EF4444',
  '#06B6D4',
  '#EC4899',
];

const MOVEMENT_STYLES: Record<
  string,
  { label: string; badge: string; sign: '+' | '-'; qtyColor: string }
> = {
  INGRESO: {
    label: 'Ingreso',
    badge: 'bg-green-100 text-green-700',
    sign: '+',
    qtyColor: 'text-green-600',
  },
  TRANSFERENCIA_ENTRADA: {
    label: 'Transf. Entrada',
    badge: 'bg-blue-100 text-blue-700',
    sign: '+',
    qtyColor: 'text-blue-600',
  },
  ANULACION: {
    label: 'Anulación',
    badge: 'bg-purple-100 text-purple-700',
    sign: '+',
    qtyColor: 'text-purple-600',
  },
  VENTA: {
    label: 'Venta',
    badge: 'bg-sky-100 text-sky-700',
    sign: '-',
    qtyColor: 'text-dark',
  },
  TRANSFERENCIA_SALIDA: {
    label: 'Transf. Salida',
    badge: 'bg-indigo-100 text-indigo-700',
    sign: '-',
    qtyColor: 'text-indigo-600',
  },
  MERMA: {
    label: 'Merma',
    badge: 'bg-red-100 text-red-700',
    sign: '-',
    qtyColor: 'text-red-600',
  },
  DONACION: {
    label: 'Donación',
    badge: 'bg-amber-100 text-amber-700',
    sign: '-',
    qtyColor: 'text-amber-600',
  },
  AJUSTE: {
    label: 'Ajuste',
    badge: 'bg-slate-100 text-slate-700',
    sign: '+',
    qtyColor: 'text-slate-700',
  },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/dashboard/summary`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar el dashboard');
      }
      setData(result.data);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Gráfico 1: Ventas últimos 7 días (Línea)
  const lineChartData = {
    labels: data?.salesLast7Days.map((d) => d.label) ?? [],
    datasets: [
      {
        label: 'Ventas',
        data: data?.salesLast7Days.map((d) => d.total) ?? [],
        borderColor: '#2563EB',
        backgroundColor: 'rgba(37, 99, 235, 0.08)',
        borderWidth: 2.5,
        pointBackgroundColor: '#2563EB',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${formatCLP(Number(ctx.parsed.y || 0))}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#64748B', font: { size: 12 } },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: '#F1F5F9' },
        ticks: {
          color: '#64748B',
          font: { size: 11 },
          callback: (val) => {
            const num = Number(val);
            if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
            if (num >= 1_000) return `$${Math.round(num / 1_000)}k`;
            return `$${num}`;
          },
        },
      },
    },
  };

  // Gráfico 2: Top 5 productos más vendidos (Barras horizontales)
  const barChartData = {
    labels:
      data?.topProducts.map((p) =>
        p.name.length > 22 ? `${p.name.slice(0, 22)}…` : p.name
      ) ?? [],
    datasets: [
      {
        label: 'Unidades vendidas',
        data: data?.topProducts.map((p) => p.unitsSold) ?? [],
        backgroundColor: '#2563EB',
        hoverBackgroundColor: '#1D4ED8',
        borderRadius: { topRight: 6, bottomRight: 6 },
        barThickness: 22,
      },
    ],
  };

  const barChartOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => {
            const idx = items[0]?.dataIndex ?? 0;
            return data?.topProducts[idx]?.name ?? '';
          },
          label: (ctx) => ` ${formatNumber(Number(ctx.parsed.x || 0))} uds.`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: '#F1F5F9' },
        ticks: { color: '#64748B', font: { size: 11 }, precision: 0 },
      },
      y: {
        border: { display: false },
        grid: { display: false },
        ticks: { color: '#334155', font: { size: 12, weight: 500 } },
      },
    },
  };

  // Gráfico 3: Distribución de inventario por bodega (Dona)
  const warehouseDistribution = data?.inventoryByWarehouse ?? [];

  const warehouseChartData = {
    labels: warehouseDistribution.map((w) => w.warehouseName),
    datasets: [
      {
        data: warehouseDistribution.map((w) => w.totalValue),
        backgroundColor: warehouseDistribution.map(
          (_, idx) => WAREHOUSE_COLORS[idx % WAREHOUSE_COLORS.length]
        ),
        borderColor: '#FFFFFF',
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  const warehouseChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16,
          color: '#334155',
          font: { size: 12 },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const value = Number(ctx.parsed || 0);
            const total = warehouseDistribution.reduce((acc, w) => acc + w.totalValue, 0);
            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return ` ${formatCLP(value)} (${pct}%)`;
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto flex flex-col gap-6 mb-12">
        <header>
          <h1 className="text-2xl lg:text-3xl font-bold text-dark tracking-tight">Dashboard</h1>
          <p className="text-slate-mid mt-1 text-sm">Resumen general del negocio</p>
        </header>
        <div className="bg-white rounded-xl border border-light-gray p-16 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-mid text-sm">Cargando métricas del negocio...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto flex flex-col gap-6 mb-12 sm:px-0">
      {/* Header */}
      <header>
        <h1 className="text-2xl lg:text-3xl font-bold text-dark tracking-tight">Dashboard</h1>
        <p className="text-slate-mid mt-1 text-sm">Resumen general del negocio</p>
      </header>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-danger text-sm font-medium flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchDashboard}
            className="underline text-xs hover:text-red-700 shrink-0"
          >
            Reintentar
          </button>
        </div>
      )}

      {data && (
        <>
          {/* Fila 1: 4 Tarjetas KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
            {/* KPI 1: Ventas del día */}
            <article className="bg-white rounded-xl border border-light-gray p-5 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-mid">Ventas del día</span>
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-primary flex items-center justify-center shrink-0">
                  <DollarSign size={18} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-dark tracking-tight truncate">
                  {formatCLP(data.kpis.salesToday)}
                </p>
                <p
                  className={`text-xs font-medium mt-1 ${
                    data.kpis.salesChangePercent === null
                      ? 'text-slate-light'
                      : data.kpis.salesChangePercent >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {data.kpis.salesChangePercent === null
                    ? 'Sin ventas ayer'
                    : `${data.kpis.salesChangePercent >= 0 ? '+' : ''}${
                        data.kpis.salesChangePercent
                      }% vs. ayer`}
                </p>
              </div>
            </article>

            {/* KPI 2: Transacciones hoy */}
            <article className="bg-white rounded-xl border border-light-gray p-5 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-mid">Transacciones hoy</span>
                <div className="w-9 h-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                  <ShoppingCart size={18} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-dark tracking-tight">
                  {formatNumber(data.kpis.transactionsToday)}
                </p>
                <p className="text-xs text-slate-mid mt-1">
                  Ticket prom: {formatCLP(data.kpis.averageTicket)}
                </p>
              </div>
            </article>

            {/* KPI 3: Productos críticos */}
            <article
              onClick={() => navigate('/critical-stock')}
              className="bg-white rounded-xl border border-light-gray p-5 flex flex-col justify-between gap-3 cursor-pointer hover:border-red-300 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-mid">Productos críticos</span>
                <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} />
                </div>
              </div>
              <div>
                <p
                  className={`text-2xl font-extrabold tracking-tight ${
                    data.kpis.criticalProductsCount > 0 ? 'text-red-600' : 'text-dark'
                  }`}
                >
                  {formatNumber(data.kpis.criticalProductsCount)}
                </p>
                <p
                  className={`text-xs font-medium mt-1 ${
                    data.kpis.criticalProductsCount > 0 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {data.kpis.criticalProductsCount > 0
                    ? 'Requieren reposición'
                    : 'Stock saludable'}
                </p>
              </div>
            </article>

            {/* KPI 4: Valor inventario */}
            <article className="bg-white rounded-xl border border-light-gray p-5 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-mid">Valor inventario</span>
                <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Package size={18} />
                </div>
              </div>
              <div>
                <p
                  className="text-2xl font-extrabold text-dark tracking-tight truncate"
                  title={formatCLP(data.kpis.inventoryValue)}
                >
                  {formatCLP(data.kpis.inventoryValue)}
                </p>
                <p className="text-xs text-slate-mid mt-1">
                  En {data.kpis.activeWarehousesCount}{' '}
                  {data.kpis.activeWarehousesCount === 1 ? 'bodega activa' : 'bodegas activas'}
                </p>
              </div>
            </article>
          </div>

          {/* Fila 2: Gráficos principales */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Gráfico 1: Ventas últimos 7 días */}
            <div className="bg-white rounded-xl border border-light-gray p-5 sm:p-6 flex flex-col gap-4">
              <div>
                <h2 className="text-base font-bold text-dark">Ventas últimos 7 días</h2>
                <p className="text-xs text-slate-light mt-0.5">Evolución diaria en CLP</p>
              </div>
              <div className="h-64 sm:h-72 w-full">
                <Line data={lineChartData} options={lineChartOptions} />
              </div>
            </div>

            {/* Gráfico 2: Top 5 productos más vendidos */}
            <div className="bg-white rounded-xl border border-light-gray p-5 sm:p-6 flex flex-col gap-4">
              <div>
                <h2 className="text-base font-bold text-dark">Productos más vendidos</h2>
                <p className="text-xs text-slate-light mt-0.5">
                  Top 5 por unidades (últimos 30 días)
                </p>
              </div>
              {data.topProducts.length === 0 ? (
                <div className="h-64 sm:h-72 flex items-center justify-center text-sm text-slate-mid">
                  Aún no hay ventas registradas en los últimos 30 días.
                </div>
              ) : (
                <div className="h-64 sm:h-72 w-full">
                  <Bar data={barChartData} options={barChartOptions} />
                </div>
              )}
            </div>
          </div>

          {/* Fila 3: Distribución de inventario por bodega + Movimientos recientes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Panel Izquierdo: Distribución de inventario por bodega */}
            <div className="bg-white rounded-xl border border-light-gray p-5 sm:p-6 flex flex-col gap-4">
              <div>
                <h2 className="text-base font-bold text-dark">
                  Distribución de inventario por bodega
                </h2>
                <p className="text-xs text-slate-light mt-0.5">
                  Valorización de stock por bodega activa
                </p>
              </div>
              {warehouseDistribution.length === 0 ? (
                <div className="h-64 sm:h-72 flex items-center justify-center text-sm text-slate-mid">
                  No hay inventario distribuido en bodegas.
                </div>
              ) : (
                <div className="h-64 sm:h-72 w-full">
                  <Doughnut data={warehouseChartData} options={warehouseChartOptions} />
                </div>
              )}
            </div>

            {/* Panel Derecho: Movimientos recientes (sin link a /movements) */}
            <div className="bg-white rounded-xl border border-light-gray overflow-hidden flex flex-col">
              <div className="px-5 sm:px-6 py-4 border-b border-light-gray flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-dark truncate">
                  Movimientos recientes
                </h2>
              </div>

              {data.recentMovements.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-mid">
                  No hay movimientos recientes registrados.
                </div>
              ) : (
                <div className="divide-y divide-light-gray">
                  {data.recentMovements.map((mov) => {
                    const style = MOVEMENT_STYLES[mov.type] ?? {
                      label: mov.type,
                      badge: 'bg-slate-100 text-slate-700',
                      sign: '+',
                      qtyColor: 'text-dark',
                    };

                    return (
                      <div
                        key={mov.id}
                        className="px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${style.badge}`}
                          >
                            {style.label}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-dark truncate">
                              {mov.productName}
                            </p>
                            <p className="text-xs text-slate-light truncate mt-0.5">
                              {mov.warehouseName} • {formatTimeChile(mov.createdAt)}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-sm font-mono font-bold shrink-0 ${style.qtyColor}`}
                        >
                          {style.sign}
                          {formatNumber(mov.quantity)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Fila 4: Alertas de stock crítico (Ancho completo) */}
          <div className="bg-white rounded-xl border border-light-gray overflow-hidden flex flex-col w-full">
            <div className="px-5 sm:px-6 py-4 border-b border-light-gray flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle size={18} className="text-red-600 shrink-0" />
                <h2 className="text-base font-bold text-dark truncate">
                  Alertas de stock crítico
                </h2>
              </div>
              <button
                onClick={() => navigate('/critical-stock')}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 shrink-0"
              >
                Ver todas <ArrowRight size={14} />
              </button>
            </div>

            {data.criticalAlerts.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-mid">
                No hay productos en estado crítico.
              </div>
            ) : (
              <div className="divide-y divide-light-gray">
                {data.criticalAlerts.map((alert) => (
                  <div
                    key={alert.stockId}
                    className="px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-dark truncate">
                        {alert.productName}
                      </p>
                      <p className="text-xs text-slate-mid truncate mt-0.5">
                        {alert.warehouseName}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-600">
                          Actual: {formatNumber(alert.currentStock)}
                        </p>
                        <p className="text-[12px] text-slate-light">
                          Mín: {formatNumber(alert.criticalStock)}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-sm font-mono font-bold bg-red-100 text-red-600">
                        {formatNumber(alert.deficit)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}