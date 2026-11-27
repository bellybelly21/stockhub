import { useState, useEffect, useRef } from 'react';
import {
  Scan,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Package,
  AlertCircle,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { WarehouseService } from '../services/warehouse.service';
import { ProductService } from '../services/product.service';
import { StockService } from '../services/stock.service';
import type { WarehouseOption } from '../types/inventory';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';

interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  brand: string;
  supplier: string;
  unitOfMeasure: string;
  stock?: number;
  status: 'ACTIVO' | 'EN_OFERTA' | 'INACTIVO';
}

interface EntryResult {
  previousStock: number;
  addedQuantity: number;
  newStock: number;
}

export default function MerchandiseEntryPage() {
  const { accessToken, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [warehouse, setWarehouse] = useState('');
  const [scannedCode, setScannedCode] = useState('');
  const [quantity, setQuantity] = useState('');

  const [product, setProduct] = useState<Product | null>(null);
  const [entryResult, setEntryResult] = useState<EntryResult | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    let isMounted = true;
    WarehouseService.getActive(accessToken)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setWarehouses(res.data);
          // Para bodegueros, pre-seleccionar su bodega asignada; para admin, la primera disponible
          if (!isAdmin && user?.assignedWarehouseId) {
            setWarehouse(String(user.assignedWarehouseId));
          } else {
            setWarehouse((prev) => prev || String(res.data[0].id));
          }
        }
      })
      .catch((err) => {
        console.error('Error al cargar bodegas', err);
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  useEffect(() => {
    if (step === 1 && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [step]);

  const handleSearchProduct = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scannedCode.trim() || !accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const foundProduct = await ProductService.searchByCode<Product>(
        accessToken,
        scannedCode.trim(),
        warehouse
      );
      setProduct(foundProduct);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Error de conexión al buscar el producto');
      setScannedCode('');
      if (barcodeInputRef.current) barcodeInputRef.current.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchProduct();
    }
  };

  const handleRegisterEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);

    if (isNaN(qty) || qty <= 0) {
      setError('Por favor ingrese una cantidad válida mayor a 0.');
      return;
    }
    if (!product?.id || !accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const data = await StockService.registerEntry(accessToken, {
        productId: Number(product.id),
        warehouseId: Number(warehouse),
        quantity: qty,
      });

      const resolvedData = data.data ?? data;
      setEntryResult({
        previousStock: resolvedData.previousStock ?? product.stock ?? 0,
        addedQuantity: qty,
        newStock: resolvedData.newStock ?? (product.stock ?? 0) + qty,
      });

      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un problema al guardar la entrada.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewEntry = () => {
    setScannedCode('');
    setQuantity('');
    setProduct(null);
    setEntryResult(null);
    setError(null);
    setStep(1);
  };

  return (
    <section className="max-w-4xl mx-auto flex flex-col gap-6 mb-12 sm:px-0">
      <header className="mb-2">
        <h1 className="text-2xl lg:text-3xl font-bold text-dark tracking-tight">
          Registrar entrada de mercancía
        </h1>
        <p className="text-slate-mid mt-1 text-sm">
          Escanee el código de barras del producto para registrar una recepción
        </p>
      </header>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-danger text-danger text-sm font-medium flex items-center gap-2 rounded-md">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {step === 1 && (
        <div className="bg-white rounded-xl border border-light-gray p-8">
          <form onSubmit={handleSearchProduct} className="flex flex-col gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-dark mb-2">
                Bodega destino <span className="text-danger">*</span>
              </label>
              <Select
                name="warehouse"
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
                disabled={warehouses.length === 0 || !isAdmin}
              />
              {!isAdmin && (
                <p className="text-xs text-slate-light mt-2">
                  Solo los administradores pueden cambiar la bodega de destino.
                </p>
              )}
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

      {step === 2 && product && (
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-xl border border-light-gray p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
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
                {warehouses.find((w) => Number(w.id) === Number(warehouse))?.name || 'Bodega seleccionada'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-light-gray p-6">
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

      {step === 3 && entryResult && product && (
        <div className="flex flex-col gap-6">
          <div className="bg-[#dbfce8] border border-[#16A34A]/20 rounded-xl p-5 flex items-center gap-4">
            <div className="text-[#16A34A] bg-white rounded-full p-1">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 className="text-[#15803d] font-bold text-base">
                Entrada registrada correctamente
              </h3>
              <p className="text-[#166534] text-sm mt-0.5">
                El stock ha sido actualizado en el sistema
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-light-gray p-8 text-center">
            <h2 className="text-lg font-bold text-dark text-left mb-6">{product.name}</h2>

            <div className="grid grid-cols-3 divide-x divide-light-gray mb-8">
              <div className="flex flex-col items-center justify-center p-4">
                <span className="text-xs font-bold text-slate-light uppercase tracking-wider mb-2">
                  Stock anterior
                </span>
                <span className="text-4xl font-bold text-slate-mid">
                  {entryResult.previousStock}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-4">
                <span className="text-xs font-bold text-slate-light uppercase tracking-wider mb-2">
                  Cantidad ingresada
                </span>
                <span className="text-4xl font-bold text-primary">
                  +{entryResult.addedQuantity}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-4">
                <span className="text-xs font-bold text-slate-light uppercase tracking-wider mb-2">
                  Nuevo stock
                </span>
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