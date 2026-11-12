import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router';
import { Save, X, AlertCircle } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';

import { useAuth, API_URL } from '../context/AuthContext'; 

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams(); 
  const location = useLocation();
  const { accessToken } = useAuth(); 
  
  const isViewMode = location.pathname.includes('/view/');
  const isEditMode = location.pathname.includes('/edit/');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado para controlar el modal de confirmación del status
  const [statusConfirm, setStatusConfirm] = useState({ isOpen: false, pendingValue: '' });

  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    brand: '',
    supplier: '',
    unitOfMeasure: 'UNIDAD',
    weight: '',
    volume: '',
    basePrice: '', 
    criticalStock: '10', 
    status: 'ACTIVO',
  });

  useEffect(() => {
    if (id && (isEditMode || isViewMode)) {
      const fetchProduct = async () => {
        setIsLoadingData(true);
        try {
          const response = await fetch(`${API_URL}/api/products/${id}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          const result = await response.json();
          
          if (!response.ok) throw new Error(result.error || 'Error al cargar el producto');
          
          const p = result.data;
          setFormData({
            sku: p.sku || '',
            barcode: p.barcode || '',
            name: p.name || '',
            brand: p.brand || '',
            supplier: p.supplier || '',
            unitOfMeasure: p.unitOfMeasure || 'UNIDAD',
            weight: p.weight?.toString() || '',
            volume: p.volume?.toString() || '',
            basePrice: p.basePrice?.toString() || '', 
            criticalStock: p.criticalStock?.toString() || '10', 
            status: p.status || 'ACTIVO',
          });
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchProduct();
    }
  }, [id, isEditMode, isViewMode, accessToken]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Interceptamos el cambio de estado para mostrar la confirmación
    if (name === 'status' && !isViewMode) {
      setStatusConfirm({ isOpen: true, pendingValue: value });
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const confirmStatusChange = () => {
    setFormData((prev) => ({ ...prev, status: statusConfirm.pendingValue }));
    setStatusConfirm({ isOpen: false, pendingValue: '' });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setFormData((prev) => ({ ...prev, basePrice: rawValue }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const parsedBasePrice = parseInt(formData.basePrice, 10);
      const parsedCriticalStock = parseFloat(formData.criticalStock);

      if (isNaN(parsedBasePrice)) throw new Error('El precio base debe ser un número válido.');

      const payload: Record<string, any> = {
        sku: formData.sku.trim(),
        barcode: formData.barcode.trim(),
        name: formData.name.trim(),
        brand: formData.brand.trim(),
        supplier: formData.supplier.trim(),
        unitOfMeasure: formData.unitOfMeasure,
        status: formData.status,
        basePrice: parsedBasePrice,
        criticalStock: isNaN(parsedCriticalStock) ? 0 : parsedCriticalStock,
      };

      if (formData.weight && formData.weight.trim() !== '') payload.weight = parseFloat(formData.weight);
      if (formData.volume && formData.volume.trim() !== '') payload.volume = parseFloat(formData.volume);

      const url = isEditMode ? `${API_URL}/api/products/${id}` : `${API_URL}/api/products`;
      const method = isEditMode ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}` 
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          const zodErrors = data.errors.map((err: any) => `${err.path}: ${err.message}`).join(' | ');
          throw new Error(`Datos inválidos: ${zodErrors}`);
        }
        throw new Error(data.error || data.message || 'Error al guardar los datos.');
      }

      navigate('/products');
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pageTitle = isViewMode ? 'Detalles del producto' : isEditMode ? 'Editar producto' : 'Ficha de producto';
  const pageSubtitle = isViewMode 
    ? 'Visualizando información del producto' 
    : isEditMode ? 'Modifique los campos necesarios' : 'Complete los campos para registrar un nuevo producto';

  if (isLoadingData) {
    return <div className="p-12 text-center text-slate-mid">Cargando información del producto...</div>;
  }

  return (
    <>
      <section className="max-w-5xl mx-auto flex flex-col gap-6 mb-12 px-4 sm:px-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-dark tracking-tight">{pageTitle}</h1>
          <p className="text-slate-mid mt-1 text-sm">{pageSubtitle}</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-danger text-danger text-sm font-medium flex items-center gap-2 rounded-md">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          
          <div className="bg-white rounded-xl border border-light-gray p-6">
            <h2 className="text-sm font-bold text-dark-different mb-4 uppercase tracking-wide">Identificación del producto</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1.5">SKU <span className="text-danger">*</span></label>
                <Input name="sku" value={formData.sku} onChange={handleChange} required disabled={isViewMode} />
                {!isViewMode && <p className="text-xs text-slate-light mt-1.5">El SKU debe ser único.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1.5">Código de barras <span className="text-danger">*</span></label>
                <Input name="barcode" value={formData.barcode} onChange={handleChange} required disabled={isViewMode} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-light-gray p-6">
            <h2 className="text-sm font-bold text-dark-different mb-4 uppercase tracking-wide">Información general</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 gap-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1.5">Nombre <span className="text-danger">*</span></label>
                <Input name="name" value={formData.name} onChange={handleChange} required disabled={isViewMode} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1.5">Marca <span className="text-danger">*</span></label>
                <Input name="brand" value={formData.brand} onChange={handleChange} required disabled={isViewMode} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1.5">Proveedor <span className="text-danger">*</span></label>
                <Input name="supplier" value={formData.supplier} onChange={handleChange} required disabled={isViewMode} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1.5">Unidad de medida <span className="text-danger">*</span></label>
                <Select name="unitOfMeasure" value={formData.unitOfMeasure} onChange={handleChange} disabled={isViewMode}
                  options={[
                    { value: 'UNIDAD', label: 'Unidad' },
                    { value: 'KG', label: 'Kilogramos (kg)' },
                    { value: 'LITRO', label: 'Litros (L)' },
                    { value: 'M3', label: 'Metros Cúbicos (m³)' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1.5">Peso</label>
                <Input name="weight" type="number" step="0.001" min="0" value={formData.weight} onChange={handleChange} disabled={isViewMode} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1.5">Volumen</label>
                <Input name="volume" type="number" step="0.001" min="0" value={formData.volume} onChange={handleChange} disabled={isViewMode} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-light-gray p-6 ">
            <h2 className="text-sm font-bold text-dark-different mb-4 uppercase tracking-wide">Control de stock y estado</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1.5">Stock crítico <span className="text-danger">*</span></label>
                <Input name="criticalStock" type="number" step="0.001" min="0" value={formData.criticalStock} onChange={handleChange} required disabled={isViewMode} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1.5">Precio Base <span className="text-danger">*</span></label>
                <Input name="basePrice" type="text" value={formData.basePrice ? new Intl.NumberFormat('es-CL').format(Number(formData.basePrice)) : ''} onChange={handlePriceChange} required disabled={isViewMode} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-dark mb-1.5">Estado <span className="text-danger">*</span></label>
                <Select name="status" value={formData.status} onChange={handleChange} disabled={isViewMode}
                  options={[
                    { value: 'ACTIVO', label: 'Activo' },
                    { value: 'EN_OFERTA', label: 'En Oferta' },
                    { value: 'DONADO', label: 'Donado' },
                    { value: 'INACTIVO', label: 'Inactivo' },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/products')}
              disabled={isSubmitting}
              leftIcon={<X size={18} />}
            >
              {isViewMode ? 'Volver' : 'Cancelar'}
            </Button>
            
            {!isViewMode && (
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                isLoading={isSubmitting}
                leftIcon={!isSubmitting && <Save size={18} />}
              >
                {isEditMode ? 'Guardar cambios' : 'Guardar producto'}
              </Button>
            )}
          </div>
        </form>
      </section>

      {statusConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px]">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm w-full mx-4 border border-light-gray">
            <h3 className="text-lg font-bold text-dark mb-2">Confirmar cambio</h3>
            <p className="text-slate-mid text-sm mb-6">
              ¿Estás seguro que deseas cambiar el estado del producto a <strong className="text-dark">{statusConfirm.pendingValue}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <Button 
                variant="secondary" 
                onClick={() => setStatusConfirm({ isOpen: false, pendingValue: '' })}
              >
                Cancelar
              </Button>
              <Button 
                variant="primary" 
                onClick={confirmStatusChange}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}