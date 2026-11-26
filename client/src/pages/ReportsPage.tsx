import { useState } from 'react';
import {
  Package,
  TrendingUp,
  Users,
  Download,
  AlertCircle,
  Loader2,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ReportService, type ReportType } from '../services/report.service';

function toInputDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(isoDate: string) {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export default function ReportsPage() {
  const { accessToken } = useAuth();

  const now = new Date();
  const initialFrom = toInputDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const initialTo = toInputDate(now);

  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);
  const [appliedRange, setAppliedRange] = useState({
    from: initialFrom,
    to: initialTo,
  });

  const [downloading, setDownloading] = useState<ReportType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rangeAppliedMsg, setRangeAppliedMsg] = useState(false);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate) {
      setError('Debes seleccionar ambas fechas.');
      return;
    }
    if (fromDate > toDate) {
      setError('La fecha "Desde" no puede ser mayor que la fecha "Hasta".');
      return;
    }

    setError(null);
    setAppliedRange({ from: fromDate, to: toDate });
    setRangeAppliedMsg(true);
    setTimeout(() => setRangeAppliedMsg(false), 3000);
  };

  const handleDownload = async (type: ReportType) => {
    if (!accessToken) return;

    setDownloading(type);
    setError(null);

    try {
      const { blob, filename } = await ReportService.downloadExcel(
        accessToken,
        type,
        appliedRange
      );

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Error al descargar el archivo');
    } finally {
      setDownloading(null);
    }
  };

  const reportCards = [
    {
      id: 'stock' as ReportType,
      title: 'Estado Diario de Stock',
      description:
        'Inventario actualizado por bodega activa con stock crítico, valorización y totales calculados con fórmulas.',
      icon: Package,
      iconBg: 'bg-purple-50 text-purple-600',
    },
    {
      id: 'sales' as ReportType,
      title: 'Consolidado de Ventas',
      description:
        'Detalle de ventas emitidas en el período seleccionado con desglose total y promedios.',
      icon: TrendingUp,
      iconBg: 'bg-blue-50 text-primary',
    },
    {
      id: 'sellers' as ReportType,
      title: 'Desempeño por Vendedor',
      description:
        'Volumen de ventas, número de transacciones y ticket promedio por trabajador con celdas calculadas.',
      icon: Users,
      iconBg: 'bg-green-50 text-green-600',
    },
  ];

  return (
    <section className="max-w-7xl mx-auto flex flex-col gap-6 mb-12">
      <header>
        <h1 className="text-2xl lg:text-3xl font-bold text-dark tracking-tight">
          Reportes
        </h1>
        <p className="text-slate-mid mt-1 text-sm">
          Genere reportes del sistema y expórtelos a Excel
        </p>
      </header>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-danger text-sm font-medium flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={handleApplyFilter}
        className="bg-white rounded-xl border border-light-gray p-4 sm:p-5 flex flex-col md:flex-row md:items-end gap-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-mid">Fecha desde</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-light-gray text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-mid">Fecha hasta</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-light-gray text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </div>

        <button
          type="submit"
          className="w-full md:w-auto px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <FileSpreadsheet size={16} />
          <span>Generar reportes</span>
        </button>
      </form>

      <div className="flex items-center justify-between text-xs text-slate-mid px-1">
        <span>
          Período activo para ventas y desempeño:{' '}
          <strong className="text-dark">
            {formatDisplayDate(appliedRange.from)} - {formatDisplayDate(appliedRange.to)}
          </strong>
        </span>
        {rangeAppliedMsg && (
          <span className="text-green-600 font-medium flex items-center gap-1">
            <CheckCircle2 size={14} /> Período actualizado
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reportCards.map((card) => {
          const Icon = card.icon;
          const isLoading = downloading === card.id;

          return (
            <article
              key={card.id}
              className="bg-white rounded-xl border border-light-gray p-6 flex flex-col justify-between gap-6 hover:border-primary/40 transition-colors"
            >
              <div className="flex flex-col gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.iconBg}`}
                >
                  <Icon size={24} />
                </div>

                <h2 className="text-lg font-bold text-dark mt-1">{card.title}</h2>
                <p className="text-sm text-slate-mid leading-relaxed">
                  {card.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDownload(card.id)}
                disabled={downloading !== null}
                className="w-full py-2.5 px-4 rounded-lg border border-primary text-primary hover:bg-primary hover:text-white disabled:opacity-50 text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                <span>{isLoading ? 'Descargando...' : 'Descargar .xlsx'}</span>
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}