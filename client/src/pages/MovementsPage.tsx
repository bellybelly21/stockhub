import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Scan, ArrowLeft, ArrowRight, CheckCircle2, Package, AlertCircle, Check } from 'lucide-react';
import { useAuth, API_URL } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';

// Definición extendida del producto para incluir el stock actual
interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  brand: string;
  supplier: string;
  unitOfMeasure: string;
  stock?: number; 
  status: 'ACTIVO' | 'EN_OFERTA' | 'INACTIVO' | 'DONADO';
}

interface EntryResult {
  previousStock: number;
  addedQuantity: number;
  newStock: number;
}

export default function MerchandiseEntryPage() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [warehouses, setWarehouses] = useState<{id: string, name: string}[]>([]);

  // Estados del flujo
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Datos del formulario
  const [warehouse, setWarehouse] = useState('bodega_central'); // Valor por defecto
  const [scannedCode, setScannedCode] = useState('');
  const [quantity, setQuantity] = useState('');
  
  // Datos recuperados/generados
  const [product, setProduct] = useState<Product | null>(null);
  const [entryResult, setEntryResult] = useState<EntryResult | null>(null);

  // Cargar bodegas dinámicamente al iniciar el componente
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const response = await fetch(`${API_URL}/api/warehouses`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
          setWarehouses(data.data);
          setWarehouse(data.data[0].id); // Seleccionar la primera bodega por defecto
        }
      } catch (err) {
        console.error('Error al cargar bodegas', err);
      }
    };

    fetchWarehouses();
  }, [accessToken]);

  // Auto-focus en el input del escáner al cargar el paso 1
  useEffect(() => {
    if (step === 1 && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [step]);

  // Buscar producto por código de barras o SKU
  const handleSearchProduct = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scannedCode.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/products/search?code=${encodeURIComponent(scannedCode.trim())}&warehouseId=${warehouse}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Producto no encontrado. Verifique el código ingresado.');
      }

      // Asumimos que la API devuelve el producto encontrado en data.product o data.data
      const foundProduct = data.product || data.data || data;
      
      if (!foundProduct || !foundProduct.id) {
         throw new Error('Producto no encontrado en la base de datos.');
      }

      setProduct(foundProduct);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Error de conexión al buscar el producto');
      setScannedCode(''); // Limpiar para volver a intentar
      if (barcodeInputRef.current) barcodeInputRef.current.focus();
    } finally {
      setLoading(false);
    }
  };

  // Escuchar el "Enter" del lector de código de barras para auto-submit
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchProduct();
    }
  };

  // Registrar la entrada de mercancía
  const handleRegisterEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    
    if (isNaN(qty) || qty <= 0) {
      setError('Por favor ingrese una cantidad válida mayor a 0.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/stock/entry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          productId: product?.id,
          warehouseId: warehouse,
          quantity: qty
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al registrar la entrada de mercancía.');
      }

      // Asumimos que el backend nos devuelve el resumen del movimiento
      setEntryResult({
        previousStock: data.previousStock || (product?.stock || 0),
        addedQuantity: qty,
        newStock: data.newStock || ((product?.stock || 0) + qty)
      });

      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un problema al guardar la entrada.');
    } finally {
      setLoading(false);
    }
  };

  // Reiniciar flujo para una nueva entrada
  const handleNewEntry = () => {
    setScannedCode('');
    setQuantity('');
    setProduct(null);
    setEntryResult(null);
    setError(null);
    setStep(1);
  };

  return (
    <section className="max-w-4xl mx-auto flex flex-col gap-6 mb-12 px-4 sm:px-0">
      
      {/* Header Fijo */}
      <header className="mb-2">
        <h1 className="text-2xl lg:text-3xl font-bold text-dark tracking-tight">Registrar entrada de mercancía</h1>
        <p className="text-slate-mid mt-1 text-sm">Escanee el código de barras del producto para registrar una recepción</p>
      </header>

      {/* Manejo de errores global */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-danger text-danger text-sm font-medium flex items-center gap-2 rounded-md">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Ingreso de Código */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-light-gray p-8 shadow-sm">
          <form onSubmit={handleSearchProduct} className="flex flex-col gap-6">
            
            <div>
              <label className="block text-sm font-bold text-slate-dark mb-2">
                Bodega destino <span className="text-danger">*</span>
              </label>
              <Select 
                name="warehouse" 
                value={warehouse} 
                onChange={(e) => setWarehouse(e.target.value)}
                options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                disabled={warehouses.length === 0}
                />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-dark mb-2">
                Código de barras
              </label>
              <Input 
                ref={barcodeInputRef}
                name="barcode" 
                value={scannedCode} 
                onChange={(e) => setScannedCode(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                placeholder="Ej: SKU-001 o escanee el código..."
                required
                className="text-lg font-mono py-3"
              />
              <p className="text-xs text-slate-light mt-2">
                Escanee el código de barras del producto o ingrese manualmente el SKU
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={loading || !scannedCode.trim()}
              isLoading={loading}
              leftIcon={!loading && <Scan size={20} />}
              className="w-full mt-2 py-3 text-base"
            >
              Registrar producto
            </Button>
          </form>
        </div>
      )}

      {/* Confirmación y Cantidad */}
      {step === 2 && product && (
        <div className="flex flex-col gap-6">
          {/* Tarjeta de Información del Producto */}
          <div className="bg-white rounded-xl border border-light-gray p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="bg-blue-50 p-4 rounded-xl text-primary shrink-0">
              <Package size={32} />
            </div>
            
            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
              <div className="sm:col-span-4 mb-2">
                <h2 className="text-lg font-bold text-dark">{product.name}</h2>
              </div>
              
              <div>
                <p className="text-xs text-slate-light mb-1">SKU</p>
                <p className="text-sm font-bold font-mono text-dark">{product.sku}</p>
              </div>
              <div>
                <p className="text-xs text-slate-light mb-1">Código de barras</p>
                <p className="text-sm font-bold font-mono text-dark">{product.barcode}</p>
              </div>
              <div>
                <p className="text-xs text-slate-light mb-1">Stock actual</p>
                <p className="text-sm font-bold text-danger">
                  {product.stock !== undefined ? product.stock : '0'} uds.
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-light mb-1">Bodega destino</p>
                <p className="text-sm font-bold text-primary">
                {warehouses.find(w => w.id === warehouse)?.name || 'Bodega seleccionada'}
                </p>
              </div>
            </div>
          </div>

          {/* Formulario de Cantidad */}
          <div className="bg-white rounded-xl border border-light-gray p-6 shadow-sm">
            <form onSubmit={handleRegisterEntry} className="flex flex-col gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-dark mb-2">
                  Cantidad recibida <span className="text-danger">*</span>
                </label>
                <Input 
                  type="number"
                  min="1"
                  step="1"
                  name="quantity" 
                  value={quantity} 
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Ej: 200"
                  required
                  autoFocus
                  className="text-2xl text-center font-bold py-4"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  leftIcon={<ArrowLeft size={18} />}
                  className="w-full sm:w-1/3 py-3"
                >
                  Volver
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading || !quantity}
                  isLoading={loading}
                  leftIcon={!loading && <Check size={18} />}
                  className="w-full sm:w-2/3 py-3 text-base"
                >
                  Registrar entrada
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Éxito y Resumen */}
      {step === 3 && entryResult && product && (
        <div className="flex flex-col gap-6">
          
          {/* Banner de Éxito */}
          <div className="bg-[#dbfce8] border border-[#16A34A]/20 rounded-xl p-5 flex items-center gap-4 shadow-sm">
            <div className="text-[#16A34A] bg-white rounded-full p-1 shadow-sm">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 className="text-[#15803d] font-bold text-base">Entrada registrada correctamente</h3>
              <p className="text-[#166534] text-sm mt-0.5">El stock ha sido actualizado en el sistema</p>
            </div>
          </div>

          {/* Tarjeta de Resumen */}
          <div className="bg-white rounded-xl border border-light-gray p-8 shadow-sm text-center">
            <h2 className="text-lg font-bold text-dark text-left mb-6">{product.name}</h2>
            
            <div className="grid grid-cols-3 divide-x divide-light-gray mb-8">
              <div className="flex flex-col items-center justify-center p-4">
                <span className="text-xs font-bold text-slate-light uppercase tracking-wider mb-2">Stock anterior</span>
                <span className="text-4xl font-bold text-slate-mid">{entryResult.previousStock}</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4">
                <span className="text-xs font-bold text-slate-light uppercase tracking-wider mb-2">Cantidad ingresada</span>
                <span className="text-4xl font-bold text-primary">+{entryResult.addedQuantity}</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4">
                <span className="text-xs font-bold text-slate-light uppercase tracking-wider mb-2">Nuevo stock</span>
                <span className="text-4xl font-bold text-[#16A34A]">{entryResult.newStock}</span>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={handleNewEntry}
              leftIcon={<ArrowRight size={18} />}
              className="w-full py-3"
            >
              Nueva entrada
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}