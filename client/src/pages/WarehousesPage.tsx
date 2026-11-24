import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Warehouse as WarehouseIcon, MapPin, AlertCircle } from 'lucide-react';
import { useAuth, API_URL } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

export interface Warehouse {
  id: string;
  name: string;
  location: string | null;
  totalProducts: number;
  totalUnits: number;
  totalValue: number;
}

const formatNumber = (value: number) =>
  new Intl.NumberFormat('es-CL', { maximumFractionDigits: 3 }).format(value);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);

export default function WarehousesPage() {
  const navigate = useNavigate();
  const { accessToken, user } = useAuth();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  const fetchWarehouses = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/warehouses`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Error al cargar las bodegas');
      }

      setWarehouses(Array.isArray(data.data) ? data.data : []);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  return (
    <section className="max-w-7xl mx-auto flex flex-col gap-6 mb-12 sm:px-0">
      {/* Header */}
      <header className="mb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-dark tracking-tight">Bodegas</h1>
          <p className="text-slate-mid mt-1 text-sm">
            Administración de bodegas y sucursales
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="primary"
              onClick={() => navigate('/warehouses/add')}
              leftIcon={<Plus size={18} />}
              className="shrink-0 w-full sm:w-auto"
            >
              Nueva bodega
            </Button>
          </div>
        )}
      </header>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-danger text-sm font-medium flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchWarehouses}
            className="underline text-xs hover:text-red-700 shrink-0"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Contenido */}
      {loading ? (
        <div className="bg-white rounded-xl border border-light-gray p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-mid text-sm">Cargando bodegas...</p>
        </div>
      ) : warehouses.length === 0 && !error ? (
        <div className="bg-white rounded-xl border border-light-gray p-12 text-center text-slate-mid text-sm">
          No hay bodegas activas registradas en el sistema.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {warehouses.map((warehouse) => (
            <article
              key={warehouse.id}
              className="bg-white rounded-xl border border-light-gray p-5 sm:p-6 flex flex-col justify-between gap-5 hover:border-slate-300 transition-colors"
            >
              {/* Icono, Nombre, Ubicación y Badge */}
              <div className="flex items-start justify-between gap-4 flex-row flex-wrap">
                <div className="flex items-start gap-3.5 min-w-0 flex-row flex-wrap">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-primary flex items-center justify-center shrink-0">
                    <WarehouseIcon size={22} />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-dark leading-snug break-words">
                      {warehouse.name}
                    </h2>
                    <p className="mt-1.5 text-sm text-slate-mid flex items-start gap-1.5 break-words">
                      <MapPin size={15} className="shrink-0 mt-0.5 text-slate-light" />
                      <span>
                        {warehouse.location || (
                          <span className="italic text-slate-light">Sin ubicación registrada</span>
                        )}
                      </span>
                    </p>
                  </div>
                </div>

                <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold bg-[#dbfce8] text-[#16A34A]">
                  Activo
                </span>
              </div>

              {/* Métricas de stock */}
              <div className="pt-4 border-t border-light-gray grid justify-center grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-light uppercase tracking-wider">
                    Productos
                  </p>
                  <p className="mt-1 text-base sm:text-lg font-bold text-dark truncate">
                    {formatNumber(warehouse.totalProducts)}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-light uppercase tracking-wider">
                    Unidades
                  </p>
                  <p className="mt-1 text-base sm:text-lg font-bold text-dark truncate">
                    {formatNumber(warehouse.totalUnits)}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-light uppercase tracking-wider">
                    Valorizado
                  </p>
                  <p
                    className="mt-1 text-base sm:text-lg font-bold text-dark truncate"
                    title={formatCurrency(warehouse.totalValue)}
                  >
                    {formatCurrency(warehouse.totalValue)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}