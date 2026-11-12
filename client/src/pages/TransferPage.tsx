import { useState, useEffect, useMemo } from 'react';
import { 
  ArrowRightLeft, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Check, 
  ArrowLeft 
} from 'lucide-react';
import { useAuth, API_URL } from '../context/AuthContext';
import { InventoryService } from '../services/inventory.service';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface Warehouse {
  id: string;
  name: string;
}

interface TransferSuccessData {
  quantity: number;
  productName: string;
  sourceWarehouseName: string;
  destWarehouseName: string;
  newSourceStock: number;
  newDestStock: number;
}

export default function TransferPage() {
  const { accessToken, user } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  
  const [originStock, setOriginStock] = useState<number>(0);
  const [destStock, setDestStock] = useState<number>(0);
  const [loadingStock, setLoadingStock] = useState<boolean>(false);
  
  const [selectedOrigin, setSelectedOrigin] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<TransferSuccessData | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (!accessToken) return;
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        const [prodRes, whRes] = await Promise.all([
          fetch(`${API_URL}/api/products`, { headers: { Authorization: `Bearer ${accessToken}` } }),
          InventoryService.getActiveWarehouses(accessToken)
        ]);

        if (!isMounted) return;

        const prodData = await prodRes.json();
        setProducts(Array.isArray(prodData) ? prodData : prodData.data || []);

        const activeWarehouses = whRes.data || [];
        setWarehouses(activeWarehouses);

        if (user?.assignedWarehouseId) {
          setSelectedOrigin(user.assignedWarehouseId);
        } else if (isAdmin && activeWarehouses.length > 0) {
          setSelectedOrigin(activeWarehouses[0].id);
        }
      } catch {
        if (isMounted) setError('Error al cargar productos y bodegas.');
      }
    };

    fetchInitialData();
    return () => { isMounted = false; };
  }, [accessToken, user, isAdmin]);

  const currentProduct = useMemo(
    () => products.find(p => p.id === selectedProduct),
    [products, selectedProduct]
  );

  const originWarehouseObj = useMemo(
    () => warehouses.find(w => w.id === selectedOrigin),
    [warehouses, selectedOrigin]
  );

  const destWarehouseObj = useMemo(
    () => warehouses.find(w => w.id === selectedDestination),
    [warehouses, selectedDestination]
  );

  useEffect(() => {
    if (!currentProduct || !selectedOrigin || !accessToken) {
      setOriginStock(0);
      setDestStock(0);
      return;
    }

    let isMounted = true;
    setLoadingStock(true);

    InventoryService.getGlobalInventory(accessToken, {
      warehouseId: 'Todas',
      status: 'Todos',
      search: currentProduct.sku,
    })
      .then((res) => {
        if (!isMounted) return;
        const itemsBySku = res.data?.filter((item: any) => item.sku === currentProduct.sku) || [];

        const originMatch = itemsBySku.find((i: any) => i.warehouse === originWarehouseObj?.name || i.warehouseId === selectedOrigin);
        setOriginStock(originMatch ? Number(originMatch.stock) : 0);

        if (selectedDestination) {
          const destMatch = itemsBySku.find((i: any) => i.warehouse === destWarehouseObj?.name || i.warehouseId === selectedDestination);
          setDestStock(destMatch ? Number(destMatch.stock) : 0);
        } else {
          setDestStock(0);
        }
      })
      .catch(() => {
        if (isMounted) {
          setOriginStock(0);
          setDestStock(0);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingStock(false);
      });

    return () => { isMounted = false; };
  }, [currentProduct, selectedOrigin, selectedDestination, originWarehouseObj, destWarehouseObj, accessToken]);

  const productOptions = useMemo(() => [
    { value: '', label: 'Seleccione un producto...' },
    ...products.map(p => ({ value: p.id, label: `${p.sku} - ${p.name}` }))
  ], [products]);

  const originOptions = useMemo(() => [
    { value: '', label: 'Seleccionar origen...' },
    ...warehouses.map(wh => ({ value: wh.id, label: wh.name }))
  ], [warehouses]);

  const destinationOptions = useMemo(() => [
    { value: '', label: 'Seleccionar destino...' },
    ...warehouses
      .filter(wh => wh.id !== selectedOrigin)
      .map(wh => ({ value: wh.id, label: wh.name }))
  ], [warehouses, selectedOrigin]);

  const handleOriginChange = (newOriginId: string) => {
    setSelectedOrigin(newOriginId);
    if (selectedDestination === newOriginId) {
      setSelectedDestination('');
    }
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const qty = Number(quantity);
    if (!selectedOrigin) return setError('Debe seleccionar una bodega de origen.');
    if (!selectedProduct) return setError('Debe seleccionar un producto.');
    if (!selectedDestination) return setError('Debe seleccionar una bodega de destino.');
    if (selectedOrigin === selectedDestination) return setError('La bodega de origen y destino no pueden ser la misma.');
    if (!qty || qty <= 0) return setError('La cantidad debe ser mayor a 0.');
    if (qty > originStock) {
      return setError(`Stock insuficiente. Solo hay ${originStock} unidades disponibles en ${originWarehouseObj?.name || 'origen'}.`);
    }

    setIsConfirmOpen(true);
  };

  const handleConfirmTransfer = async () => {
    const qty = Number(quantity);
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/movements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          type: 'TRANSFERENCIA_SALIDA',
          productId: selectedProduct,
          fromWarehouseId: selectedOrigin,
          toWarehouseId: selectedDestination,
          quantity: qty
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Error al procesar la transferencia');
      }

      setSuccessData({
        quantity: qty,
        productName: currentProduct?.name || 'Producto',
        sourceWarehouseName: originWarehouseObj?.name || 'Bodega Origen',
        destWarehouseName: destWarehouseObj?.name || 'Bodega Destino',
        newSourceStock: Number((originStock - qty).toFixed(3)),
        newDestStock: Number((destStock + qty).toFixed(3)),
      });

      setIsConfirmOpen(false);
    } catch (err: any) {
      setIsConfirmOpen(false);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSuccessData(null);
    setSelectedProduct('');
    setSelectedDestination('');
    setQuantity('');
    setOriginStock(0);
    setDestStock(0);
    setError(null);
  };

  return (
    <section className="flex flex-col items-center gap-6 mb-12 sm:px-0">
      <div className="w-full max-w-4xl">
        <header className="mb-5 flex flex-col items-start gap-1">
          <h1 className="text-2xl lg:text-3xl font-bold text-dark tracking-tight">
            Transferir stock entre bodegas
          </h1>
          <p className="text-slate-mid text-sm">
            Mueva unidades de un producto de una bodega a otra
          </p>
        </header>

        {successData ? (
          <div className="flex flex-col gap-6 w-full">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 sm:p-5 flex gap-3 items-start ">
              <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={22} />
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-emerald-800 text-base">
                  Transferencia realizada correctamente
                </span>
                <span className="text-emerald-700 text-sm sm:text-base">
                  {successData.quantity} unidades de {successData.productName}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl  border border-light-gray p-5 sm:p-7 flex flex-col gap-5">
              <h3 className="font-bold text-dark text-lg">Saldos actualizados</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 sm:p-5 flex flex-col">
                  <span className="text-xs sm:text-sm font-medium text-slate-mid mb-1">
                    Bodega origen
                  </span>
                  <span className="font-bold text-dark text-base sm:text-lg mb-6">
                    {successData.sourceWarehouseName}
                  </span>
                  <div className="mt-auto flex items-end justify-between border-t border-slate-200 pt-3">
                    <span className="text-xs sm:text-sm text-slate-light">Stock nuevo</span>
                    <span className="font-bold text-2xl text-dark leading-none">
                      {successData.newSourceStock}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 sm:p-5 flex flex-col">
                  <span className="text-xs sm:text-sm font-medium text-slate-mid mb-1">
                    Bodega destino
                  </span>
                  <span className="font-bold text-dark text-base sm:text-lg mb-6">
                    {successData.destWarehouseName}
                  </span>
                  <div className="mt-auto flex items-end justify-between border-t border-slate-200 pt-3">
                    <span className="text-xs sm:text-sm text-slate-light">Stock nuevo</span>
                    <span className="font-bold text-2xl text-dark leading-none">
                      {successData.newDestStock}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-1 flex justify-start">
              <Button
                type="button"
                variant="secondary"
                onClick={handleReset}
                leftIcon={<ArrowLeft size={16} />}
                className="w-full sm:w-auto bg-white "
              >
                Nueva transferencia
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-light-gray p-6 md:p-8  w-full">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-danger text-sm font-medium rounded-lg flex items-center gap-2">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handlePreSubmit} className="flex flex-col gap-6">

            <div>
                <Select
                  label="Producto"
                  required
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  options={productOptions}
                  disabled={!selectedOrigin}
                  className="bg-white border-slate-300"
                />
                {selectedProduct && (
                  <p className="text-xs text-slate-mid mt-2 flex items-center gap-1">
                    Stock disponible en origen:{' '}
                    {loadingStock ? (
                      <span className="text-slate-400 italic">Consultando...</span>
                    ) : (
                      <span className={`font-bold ${originStock > 0 ? 'text-success' : 'text-danger'}`}>
                        {originStock}
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div>
                <Select
                  label="Bodega origen"
                  required
                  value={selectedOrigin}
                  onChange={(e) => handleOriginChange(e.target.value)}
                  options={originOptions}
                  disabled={!isAdmin}
                  className={!isAdmin ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-300'}
                />
                {!isAdmin && (
                  <p className="text-xs text-slate-400 mt-1">
                    Solo los administradores pueden cambiar la bodega de origen.
                  </p>
                )}
              </div>

              <Select
                label="Bodega destino"
                required
                value={selectedDestination}
                onChange={(e) => setSelectedDestination(e.target.value)}
                options={destinationOptions}
                disabled={!selectedOrigin}
                className="bg-white border-slate-300"
              />

              <Input
                label="Cantidad a transferir"
                required
                type="number"
                placeholder="0"
                min="1"
                step="0.001"
                max={originStock > 0 ? originStock : undefined}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')}
                disabled={originStock <= 0 || loadingStock}
                className="bg-white border-slate-300"
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={submitting || loadingStock || originStock <= 0 || !selectedDestination || !quantity}
                  variant="primary"
                  className="w-full h-12 text-base font-semibold flex items-center justify-center gap-2"
                >
                  <ArrowRightLeft size={20} />
                  Transferir
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 sm:p-6">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md border border-light-gray flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between p-4 sm:p-5 pb-4 border-b border-light-gray">
              <h3 className="text-base sm:text-lg font-bold text-dark">Confirmar transferencia</h3>
              <button 
                onClick={() => setIsConfirmOpen(false)}
                disabled={submitting}
                className="text-slate-light hover:text-slate-mid transition-colors p-1 rounded-md"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 sm:p-5 text-sm sm:text-base text-slate-dark text-center sm:text-left leading-relaxed">
                ¿Desea transferir <span className="font-bold">{quantity} unidades</span> de{' '}
                <span className="font-bold">{currentProduct?.name}</span> desde{' '}
                <span className="font-bold">{originWarehouseObj?.name}</span> hacia{' '}
                <span className="font-bold">{destWarehouseObj?.name}</span>?
              </div>
            </div>

            <div className="p-4 sm:p-5 pt-0 mt-auto flex flex-col-reverse sm:flex-row items-center justify-end gap-3 shrink-0">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsConfirmOpen(false)}
                disabled={submitting}
                leftIcon={<X size={18} />}
                className="w-full sm:w-auto bg-white"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmTransfer}
                disabled={submitting}
                isLoading={submitting}
                leftIcon={!submitting && <Check size={18} />}
                className="w-full sm:w-auto"
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}