import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Minus,
  AlertCircle,
  Plus,
  X,
  CheckCircle,
  ShoppingCart,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ProductService } from '../services/product.service';
import { SaleService } from '../services/sale.service';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import OutboundStockModal, {
  type Product,
  type Warehouse,
} from './OutboundStockModal';

interface PosProduct {
  productId: number;
  sku: string;
  name: string;
  brand: string;
  basePrice: number;
  stock: number;
  status: string;
}

interface CartItem {
  product: PosProduct;
  quantity: number;
}

export default function SalesPage() {
  const { accessToken, user } = useAuth();

  const [products, setProducts] = useState<PosProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [lastSaleTotal, setLastSaleTotal] = useState<number>(0);
  const [checkoutKey, setCheckoutKey] = useState<string>(
    () => `tx-pos-${crypto.randomUUID()}`
  );

  const fetchCatalog = useCallback(
    async (silent = false) => {
      if (!user?.assignedWarehouseId) {
        setError('Operación denegada: No tienes una bodega asignada para vender.');
        if (!silent) setLoading(false);
        return;
      }
      if (!accessToken) return;

      try {
        if (!silent) setLoading(true);
        const productsArray = await ProductService.getByWarehouse<any>(
          accessToken,
          user.assignedWarehouseId,
          100
        );

        const mappedProducts: PosProduct[] = productsArray.map((p: any) => {
          const warehouseStock = p.stocks?.find(
            (s: any) => s.warehouseId === user.assignedWarehouseId
          );

          return {
            productId: p.id,
            sku: p.sku,
            name: p.name,
            brand: p.brand || '',
            basePrice: Number(p.basePrice) || 0,
            stock: warehouseStock ? Number(warehouseStock.quantity) : 0,
            status: p.status || 'ACTIVO',
          };
        });

        setProducts(mappedProducts);

        setCart((prevCart) =>
          prevCart
            .map((item) => {
              const updatedProduct = mappedProducts.find(
                (p) => p.productId === item.product.productId
              );
              if (
                !updatedProduct ||
                updatedProduct.status === 'INACTIVO' ||
                updatedProduct.stock <= 0
              ) {
                return null;
              }
              return {
                product: updatedProduct,
                quantity: Math.min(item.quantity, updatedProduct.stock),
              };
            })
            .filter((item): item is CartItem => item !== null)
        );
      } catch (err: any) {
        if (!silent) setError(err.message);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [user?.assignedWarehouseId, accessToken]
  );

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  useEffect(() => {
    setCheckoutKey(`tx-pos-${crypto.randomUUID()}`);
  }, [cart]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const lowerSearch = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerSearch) ||
        p.sku.toLowerCase().includes(lowerSearch) ||
        p.brand.toLowerCase().includes(lowerSearch)
    );
  }, [products, searchTerm]);

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.basePrice * item.quantity,
    0
  );
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(amount);
  };

  const handleAddToCart = (product: PosProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.productId === product.productId);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((item) =>
          item.product.productId === product.productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      if (product.stock > 0) {
        return [...prev, { product, quantity: 1 }];
      }
      return prev;
    });
  };

  const handleUpdateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.productId === productId) {
          const newQty = item.quantity + delta;
          if (newQty > 0 && newQty <= item.product.stock) {
            return { ...item, quantity: newQty };
          }
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.productId !== productId));
  };

  const handleClearCart = () => setCart([]);

  const handleCheckout = async () => {
    if (cart.length === 0 || !accessToken) return;
    setIsProcessing(true);
    setError(null);
    setSuccess(false);
    setLastSaleTotal(cartTotal);

    try {
      const payload = {
        items: cart.map((item) => ({
          productId: item.product.productId,
          quantity: item.quantity,
          expectedPrice: item.product.basePrice,
        })),
      };

      await SaleService.createSale(accessToken, payload, checkoutKey);

      setSuccess(true);
      handleClearCart();
      await fetchCatalog(true);
    } catch (err: any) {
      console.error('Error procesando venta:', err);
      setError(err.message || 'Ocurrió un error inesperado al procesar la venta');
      await fetchCatalog(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const [isOutboundOpen, setIsOutboundOpen] = useState(false);

  const modalProducts: Product[] = useMemo(() => {
    if (!user?.assignedWarehouseId) return [];
    return products.map((p) => ({
      id: p.productId,
      sku: p.sku,
      barcode: '',
      name: p.name,
      brand: p.brand,
      supplier: '',
      unitOfMeasure: 'UN',
      status: (p.status as 'ACTIVO' | 'EN_OFERTA' | 'INACTIVO') || 'ACTIVO',
      stocks: [
        {
          id: `${p.productId}-${user.assignedWarehouseId}`,
          warehouseId: user.assignedWarehouseId!,
          quantity: p.stock,
        },
      ],
    }));
  }, [products, user?.assignedWarehouseId]);

  const modalWarehouses: Warehouse[] = useMemo(() => {
    if (!user?.assignedWarehouseId) return [];
    return [
      {
        id: user.assignedWarehouseId,
        name: 'Bodega asignada',
      },
    ];
  }, [user?.assignedWarehouseId]);

  return (
    <>
      <section className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-150px)] mb-12 sm:px-0 relative">
        <div className="flex-1 flex flex-col overflow-hidden h-full p-2">
          <div className="bg-white mb-6 shrink-0 rounded-xl!">
            <Input
              placeholder="Buscar producto por nombre, SKU o marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              startIcon={<Search size={18} className="text-slate-400" />}
              className="w-full shadow-none text-base"
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-mid text-sm">Cargando catálogo...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center text-slate-mid text-sm bg-white p-8 rounded-xl border border-light-gray">
                No se encontraron productos disponibles en tu bodega.
              </div>
            ) : (
              <div className="grid grid-cols-1 pt-3 sm:grid-cols-2 xl:grid-cols-4 gap-4 pb-12">
                {filteredProducts.map((product) => {
                  const cartItem = cart.find(
                    (i) => i.product.productId === product.productId
                  );
                  const isSelected = !!cartItem;
                  const isInactive = product.status === 'INACTIVO';
                  const isDisabled = product.stock <= 0 || isInactive;

                  return (
                    <div
                      key={product.productId}
                      onClick={() => !isDisabled && handleAddToCart(product)}
                      className={`relative bg-white rounded-xl p-4 border transition-all cursor-pointer flex flex-col justify-between h-44 hover:shadow-md
                        ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-light-gray hover:border-slate-300'}
                        ${isDisabled ? 'opacity-50 cursor-not-allowed grayscale bg-slate-50' : ''}
                      `}
                    >
                      {isSelected && (
                        <div className="absolute -top-2 z-10 -right-2 bg-primary text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-sm">
                          {cartItem.quantity}
                        </div>
                      )}

                      <div>
                        <span className="text-xs text-slate-400 font-mono tracking-wider">
                          {product.sku}
                          {isInactive && (
                            <span className="ml-2 text-rose-500 font-bold bg-rose-50 px-1.5 py-0.5 rounded">
                              INACTIVO
                            </span>
                          )}
                        </span>
                        <h3 className="text-sm font-bold text-dark mt-1 line-clamp-2 leading-tight">
                          {product.name}
                        </h3>
                      </div>

                      <div className="mt-4">
                        <div className="text-lg font-extrabold text-dark">
                          {formatCurrency(product.basePrice)}
                        </div>
                        <div
                          className={`text-xs mt-1 font-medium ${
                            product.stock <= 5 && !isDisabled
                              ? 'text-rose-500'
                              : 'text-slate-400'
                          }`}
                        >
                          {product.stock} disponibles
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-[400px] shrink-0 bg-white rounded-2xl border border-light-gray flex flex-col h-[calc(100vh-150px)] sticky top-0 shadow-sm">
          <div className="p-5 border-b border-light-gray flex items-center gap-3">
            <h2 className="text-lg font-bold text-dark">Carrito</h2>
            <span className="bg-blue-50 text-primary text-xs font-bold px-2.5 py-1 rounded-full">
              {totalItems} ítems
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                <ShoppingCart size={48} className="text-slate-200" strokeWidth={1.5} />
                <p className="text-sm">El carrito está vacío</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {cart.map((item) => (
                  <div
                    key={item.product.productId}
                    className="p-3 bg-white border border-light-gray rounded-xl flex flex-col gap-3 relative group"
                  >
                    <div className="pr-6">
                      <h4 className="text-sm font-bold text-dark leading-tight">
                        {item.product.name}
                      </h4>
                      <span className="text-xs text-slate-400 font-mono mt-0.5 block">
                        {item.product.sku}
                      </span>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(item.product.productId)}
                      className="absolute top-3 right-3 text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <X size={16} />
                    </button>

                    <div className="flex justify-between items-end mt-1">
                      <div className="flex items-center gap-3 bg-slate-50 border border-light-gray rounded-lg p-1">
                        <button
                          onClick={() => handleUpdateQuantity(item.product.productId, -1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm rounded transition-all"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-bold text-dark w-4 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.product.productId, 1)}
                          disabled={item.quantity >= item.product.stock}
                          className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm rounded transition-all disabled:opacity-30"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-extrabold text-dark">
                          {formatCurrency(item.product.basePrice * item.quantity)}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          {formatCurrency(item.product.basePrice)} c/u
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 border-t border-light-gray bg-slate-50/50 rounded-b-2xl mt-auto flex flex-col gap-4">
            <div className="flex justify-between items-end">
              <span className="text-slate-500 font-medium">Total</span>
              <span className="text-3xl font-black text-dark tracking-tight">
                {formatCurrency(cartTotal)}
              </span>
            </div>

            <Button
              variant="primary"
              onClick={handleCheckout}
              disabled={cart.length === 0 || isProcessing || !user?.assignedWarehouseId}
              className="w-full py-4 text-base shadow-md disabled:shadow-none hover:shadow-lg transition-all"
              leftIcon={isProcessing ? undefined : <CheckCircle size={20} />}
            >
              {isProcessing ? 'Procesando...' : 'Cobrar'}
            </Button>

            <button
              onClick={handleClearCart}
              disabled={cart.length === 0}
              className="text-slate-400 hover:text-dark text-sm font-medium transition-colors disabled:opacity-50"
            >
              Vaciar carrito
            </button>

            <Button
              variant="ghost"
              onClick={() => setIsOutboundOpen(true)}
              leftIcon={<AlertCircle size={18} className="text-black" />}
              className="border-light-gray border hover:bg-rose-50 hover:border-rose-300 w-full sm:w-auto font-medium"
            >
              Reportar producto defectuoso
            </Button>
          </div>
        </div>
      </section>

      {(success || error) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-[#f4f7f9] border border-light-gray rounded-2xl p-8 max-w-sm w-full flex flex-col items-center text-center shadow-2xl animate-in fade-in zoom-in duration-200">
            {success ? (
              <>
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-5">
                  <CheckCircle size={32} strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-bold text-[#111827] mb-1">Venta registrada</h3>
                <p className="text-slate-500 text-sm mb-6">
                  El stock ha sido descontado automáticamente.
                </p>
                <div className="text-[28px] font-mono font-bold text-[#111827] mb-8">
                  {formatCurrency(lastSaleTotal)}
                </div>
                <Button
                  variant="primary"
                  onClick={() => setSuccess(false)}
                  className="w-full py-3.5 text-[15px] font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] shadow-md"
                >
                  Nueva venta
                </Button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-5">
                  <AlertCircle size={32} strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-bold text-[#111827] mb-1">Error en la venta</h3>
                <p className="text-slate-500 text-sm mb-8">{error}</p>
                <Button
                  variant="primary"
                  onClick={() => setError(null)}
                  className="w-full py-3.5 text-[15px] font-semibold bg-[#334155] hover:bg-[#1e293b] border-none shadow-md"
                >
                  Volver a intentar
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <OutboundStockModal
        isOpen={isOutboundOpen}
        onClose={() => setIsOutboundOpen(false)}
        products={modalProducts}
        warehouses={modalWarehouses}
        isPosMode={true}
        initialProductId={cart[0]?.product.productId}
        onSuccess={() => {
          fetchCatalog(true);
        }}
      />
    </>
  );
}