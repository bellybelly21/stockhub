import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Eye, Edit2, RefreshCw, AlertCircle, X } from 'lucide-react';
import { useAuth, API_URL } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  brand: string;
  supplier: string;
  unitOfMeasure: string;
  status: 'ACTIVO' | 'EN_OFERTA' | 'INACTIVO';
}

export default function ProductsPage() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para el Modal de Cambio de Estado
  const [statusModal, setStatusModal] = useState<{ isOpen: boolean; productId: string | null; currentStatus: string }>({
    isOpen: false,
    productId: null,
    currentStatus: ''
  });
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/products`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Error al cargar los productos');
      }

      let productsArray = [];
      if (Array.isArray(data)) {
        productsArray = data; 
      } else if (data && Array.isArray(data.products)) {
        productsArray = data.products; 
      } else if (data && Array.isArray(data.data)) {
        productsArray = data.data; 
      } else {
        throw new Error('El formato de datos devuelto por el servidor no es válido.');
      }

      setProducts(productsArray);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Función para guardar el nuevo estado
  const handleUpdateStatus = async (newStatus: 'ACTIVO' | 'EN_OFERTA' | 'INACTIVO') => {
    if (!statusModal.productId) return;
    
    setIsUpdatingStatus(true);
    try {
      // Ajusta la ruta y método (PATCH o PUT) según la configuración de tu API
      const response = await fetch(`${API_URL}/api/products/${statusModal.productId}`, {
        method: 'PATCH', 
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar el estado');
      }

      // Actualizar el estado local para no recargar toda la lista
      setProducts(prev => prev.map(p => p.id === statusModal.productId ? { ...p, status: newStatus } : p));
      
      // Cerrar modal
      setStatusModal({ isOpen: false, productId: null, currentStatus: '' });
    } catch (err: any) {
      alert(err.message || 'Ocurrió un problema al cambiar el estado');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVO':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#dbfce8] text-[#16A34A]">Activo</span>;
      case 'EN_OFERTA':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">En Oferta</span>;
      case 'INACTIVO':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">Inactivo</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const formatUnit = (unit: string) => {
    if (!unit) return '';
    return unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase();
  };

  return (
    <section className="max-w-7xl mx-auto flex flex-col gap-6 mb-12 px-4 sm:px-0">
      
      {/* Header */}
      <header className="mb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-dark tracking-tight">Productos</h1>
          <p className="text-slate-mid mt-1 text-sm">Catálogo de productos registrados en el sistema</p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate('/products/add')}
          leftIcon={<Plus size={18} />}
          className="shrink-0"
        >
          Nuevo producto
        </Button>
      </header>

      {/* Contenedor Principal */}
      <div className="bg-white rounded-xl border border-light-gray overflow-hidden shadow-sm">
        
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200 text-danger text-sm font-medium flex justify-between items-center">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
            <button onClick={fetchProducts} className="underline text-xs hover:text-red-700">Reintentar</button>
          </div>
        )}

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-mid text-sm">Cargando productos...</p>
          </div>
        ) : products.length === 0 && !error ? (
          <div className="p-12 text-center text-slate-mid text-sm bg-white">
            No hay productos registrados en el sistema.
          </div>
        ) : (
          <>
            {/* Vista Desktop/Tablet */}
            <div className="overflow-x-auto w-full hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-light-gray">
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-mid uppercase tracking-wider">SKU</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-mid uppercase tracking-wider">Código Barras</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-mid uppercase tracking-wider">Nombre</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-mid uppercase tracking-wider">Marca</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-mid uppercase tracking-wider">Proveedor</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-mid uppercase tracking-wider">Unidad</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-mid uppercase tracking-wider">Estado</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-mid uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-gray bg-white text-sm">
                {products.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6 text-slate-mid font-mono text-xs">{product.sku}</td>
                      <td className="py-4 px-6 text-slate-light font-mono text-xs">{product.barcode}</td>
                      <td className="py-4 px-6 text-dark font-bold">{product.name}</td>
                      <td className="py-4 px-6 text-slate-mid">{product.brand}</td>
                      <td className="py-4 px-6 text-slate-mid">{product.supplier}</td>
                      <td className="py-4 px-6 text-slate-mid">{formatUnit(product.unitOfMeasure)}</td>
                      <td className="py-4 px-6 !whitespace-nowrap">{getStatusBadge(product.status)}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => navigate(`/products/view/${product.id}`)}
                            className="flex items-center gap-1.5 px-2 py-1 border border-light-gray rounded text-xs font-medium text-slate-mid hover:bg-slate-50 hover:text-primary transition-colors bg-white"
                          >
                            <Eye size={14} /> Ver
                          </button>
                          <button 
                            onClick={() => navigate(`/products/edit/${product.id}`)}
                            className="flex items-center gap-1.5 px-2 py-1 border border-light-gray rounded text-xs font-medium text-slate-mid hover:bg-slate-50 hover:text-primary transition-colors bg-white"
                          >
                            <Edit2 size={14} /> Editar
                          </button>
                          <button 
                            onClick={() => setStatusModal({ isOpen: true, productId: product.id, currentStatus: product.status })}
                            className="flex items-center gap-1.5 px-2 py-1 border border-light-gray rounded text-xs font-medium text-slate-mid hover:bg-slate-50 hover:text-primary transition-colors bg-white"
                          >
                            <RefreshCw size={14} /> Estado
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista Mobile */}
            <div className="flex flex-col divide-y divide-light-gray bg-white md:hidden">
            {products.map((product) => (
                <div key={product.id} className="p-4 flex flex-col gap-3 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-col">
                      <span className="font-bold text-dark leading-tight">{product.name}</span>
                      <span className="text-xs text-slate-mid mt-1">{product.brand} • {product.supplier}</span>
                    </div>
                    <div className="shrink-0">{getStatusBadge(product.status)}</div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-mid font-mono bg-slate-50 p-2 rounded-md border border-light-gray">
                    <span>{product.sku}</span>
                    <span className="text-slate-300">|</span>
                    <span>{product.barcode}</span>
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-slate-mid bg-slate-100 px-2 py-1 rounded">
                      {formatUnit(product.unitOfMeasure)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => navigate(`/products/view/${product.id}`)}
                        className="p-1.5 border border-light-gray rounded text-slate-mid hover:bg-slate-50 hover:text-primary transition-colors bg-white" title="Ver"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => navigate(`/products/edit/${product.id}`)}
                        className="p-1.5 border border-light-gray rounded text-slate-mid hover:bg-slate-50 hover:text-primary transition-colors bg-white" title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => setStatusModal({ isOpen: true, productId: product.id, currentStatus: product.status })}
                        className="p-1.5 border border-light-gray rounded text-slate-mid hover:bg-slate-50 hover:text-primary transition-colors bg-white" title="Estado"
                      >
                        <RefreshCw size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal de Estado */}
      {statusModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 border border-light-gray">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-dark">Cambiar Estado</h3>
              <button 
                onClick={() => setStatusModal({ isOpen: false, productId: null, currentStatus: '' })}
                className="text-slate-light hover:text-slate-mid transition-colors"
                disabled={isUpdatingStatus}
              >
                <X size={20} />
              </button>
            </div>
            
            <p className="text-sm text-slate-mid mb-4">
              Selecciona el nuevo estado para el producto.
            </p>

            <div className="flex flex-col gap-2">
              {[
                { value: 'ACTIVO', label: 'Activo', colorClass: 'hover:border-[#16A34A] hover:bg-[#dbfce8] hover:text-[#16A34A]' },
                { value: 'EN_OFERTA', label: 'En Oferta', colorClass: 'hover:border-purple-500 hover:bg-purple-100 hover:text-purple-700' },
                { value: 'INACTIVO', label: 'Inactivo', colorClass: 'hover:border-slate-500 hover:bg-slate-100 hover:text-slate-700' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleUpdateStatus(opt.value as any)}
                  disabled={isUpdatingStatus}
                  className={`
                    flex items-center justify-between p-3 rounded-lg border text-sm font-semibold transition-all
                    ${statusModal.currentStatus === opt.value 
                      ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary' 
                      : `border-light-gray text-slate-mid bg-white ${opt.colorClass}`
                    }
                    ${isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {opt.label}
                  {statusModal.currentStatus === opt.value && <span className="text-xs font-normal opacity-75">(Actual)</span>}
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                variant="secondary"
                onClick={() => setStatusModal({ isOpen: false, productId: null, currentStatus: '' })}
                disabled={isUpdatingStatus}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}