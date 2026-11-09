import { useState, useEffect } from 'react';
import { AlertCircle, X, Save } from 'lucide-react';
import { useAuth, API_URL } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';

export interface StockItem {
  id: string;
  quantity: number | string;
  warehouseId: string;
  warehouse?: { id: string; name: string };
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  brand: string;
  supplier: string;
  unitOfMeasure: string;
  status: 'ACTIVO' | 'EN_OFERTA' | 'INACTIVO';
  stocks?: StockItem[];
}

export interface Warehouse {
  id: string;
  name: string;
}

interface OutboundStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  warehouses: Warehouse[];
  initialProductId?: string;
  onSuccess: () => void;
}

export default function OutboundStockModal({
  isOpen,
  onClose,
  products,
  warehouses,
  initialProductId,
  onSuccess
}: OutboundStockModalProps) {
  const { accessToken } = useAuth();

  const [form, setForm] = useState({
    productId: '',
    warehouseId: '',
    quantity: '',
    type: 'MERMA',
    reason: 'DANADO_RECEPCION',
    comment: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setForm({
        productId: initialProductId || (products[0]?.id || ''),
        warehouseId: warehouses[0]?.id || '',
        quantity: '',
        type: 'MERMA',
        reason: 'DANADO_RECEPCION',
        comment: ''
      });
    }
  }, [isOpen, initialProductId, products, warehouses]);

  if (!isOpen) return null;

  const selectedProduct = products.find(p => p.id === form.productId);
  const availableStockInWarehouse = selectedProduct?.stocks?.find(
    s => s.warehouseId === form.warehouseId
  )?.quantity ?? 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const qty = Number(form.quantity);
    if (!form.productId || !form.warehouseId) {
      setError('Debe seleccionar un producto y una bodega.');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setError('La cantidad a retirar debe ser un número mayor a 0.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/stock/outbound`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          productId: form.productId,
          warehouseId: form.warehouseId,
          quantity: qty,
          type: form.type,
          reason: form.reason,
          comment: form.comment.trim() || undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo procesar el decremento.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado al registrar la salida');
    } finally {
      setSubmitting(false);
    }
  };

  const productOptions = [
    { value: '', label: 'Seleccione un producto...' },
    ...products.map(p => ({ value: p.id, label: `${p.name} (${p.sku})` }))
  ];

  const warehouseOptions = [
    { value: '', label: 'Seleccione bodega...' },
    ...warehouses.map(w => ({ value: w.id, label: w.name }))
  ];

  const typeOptions = [
    { value: 'MERMA', label: 'Merma / Pérdida' },
    { value: 'DONACION', label: 'Donación' },
    { value: 'AJUSTE', label: 'Ajuste directo' }
  ];

  const reasonOptions = [
    { value: 'DANADO_RECEPCION', label: 'Daño en recepción' },
    { value: 'MERMA_FISICA', label: 'Merma física / Deterioro' },
    { value: 'VENCIMIENTO', label: 'Vencimiento' },
    { value: 'DONACION', label: 'Donación corporativa' },
    { value: 'OTRO', label: 'Otro motivo' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 sm:p-6">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] border border-light-gray flex flex-col overflow-hidden">
        
        {/* Cabecera Fija */}
        <div className="flex items-center justify-between p-4 sm:p-6 pb-4 border-b border-light-gray shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-dark leading-tight">Registro de decremento excepcional</h3>
            <p className="text-xs sm:text-sm text-slate-mid mt-0.5">Salida justificada de stock por merma, daño o donación</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-light hover:text-slate-mid transition-colors shrink-0 p-1 rounded-md"
            disabled={submitting}
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto p-4 sm:p-6 gap-4">
          
          {/* Banner de error */}
          {error && (
            <div className="p-3.5 bg-red-50 border-l-4 border-danger text-danger text-sm font-medium flex items-center gap-2 rounded-md shrink-0">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-dark mb-1.5">
              Producto afectado <span className="text-danger">*</span>
            </label>
            <Select
              name="productId"
              value={form.productId}
              onChange={handleChange}
              options={productOptions}
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-dark mb-1.5">
                Bodega origen <span className="text-danger">*</span>
              </label>
              <Select
                name="warehouseId"
                value={form.warehouseId}
                onChange={handleChange}
                options={warehouseOptions}
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-dark mb-1.5">
                Stock disponible
              </label>
              <Input
                value={`${Number(availableStockInWarehouse)} unids.`}
                readOnly
                disabled
                className="bg-slate-50 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-dark mb-1.5">
                Tipo operación <span className="text-danger">*</span>
              </label>
              <Select
                name="type"
                value={form.type}
                onChange={handleChange}
                options={typeOptions}
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-dark mb-1.5">
                Causa justificada <span className="text-danger">*</span>
              </label>
              <Select
                name="reason"
                value={form.reason}
                onChange={handleChange}
                options={reasonOptions}
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-dark mb-1.5">
              Cantidad a descontar <span className="text-danger">*</span>
            </label>
            <Input
              name="quantity"
              type="number"
              min="1"
              step="0.001"
              placeholder="Ej: 5"
              value={form.quantity}
              onChange={handleChange}
              required
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-dark mb-1.5">
              Justificación de auditoría (Comentario)
            </label>
            <textarea
              name="comment"
              rows={3}
              placeholder="Detalle explicativo formal para el informe de auditoría..."
              value={form.comment}
              onChange={handleChange}
              disabled={submitting}
              className="w-full px-3 py-2 border border-light-gray rounded-md text-sm text-dark placeholder:text-slate-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none disabled:bg-slate-50 disabled:opacity-75"
            />
          </div>

          {/* Botones de acción Fijos al Pie */}
          <div className="mt-auto pt-4 flex items-center justify-end gap-3 border-t border-light-gray shrink-0 flex-wrap">
            <Button
              type="button"
              variant="secondary"
              className='!w-full sm:w-fit!'
              onClick={onClose}
              disabled={submitting}
              leftIcon={<X size={18} />}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              isLoading={submitting}
              className='!w-full sm:w-fit!'
              leftIcon={!submitting && <Save size={18} />}
            >
              Registrar decremento
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}