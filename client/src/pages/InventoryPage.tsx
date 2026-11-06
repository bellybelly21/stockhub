import React from 'react';
import { Search, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import { useInventory, InventoryProvider } from '../context/InventoryContext';
import type { ProductStatus } from '../types/inventory';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

function InventoryView() {
  const {
    inventory,
    warehouses,
    loading,
    error,
    selectedWarehouse,
    selectedStatus,
    searchTerm,
    setSelectedWarehouse,
    setSelectedStatus,
    setSearchTerm,
    fetchInventory,
  } = useInventory();

  const getStatusBadge = (status: ProductStatus) => {
    switch (status) {
      case 'ACTIVO':
        return <Badge variant="success">Activo</Badge>;
      case 'EN_OFERTA':
        return <Badge variant="purple">En Oferta</Badge>;
      case 'INACTIVO':
        return <Badge variant="danger">Inactivo</Badge>;
      default:
        return <Badge variant="info">{status}</Badge>;
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInventory();
  };

  // Preparar opciones para los Selects del UI Kit
  const warehouseOptions = [
    { value: 'Todas', label: 'Todas las bodegas' },
    ...warehouses.map((wh) => ({ value: wh.id, label: wh.name }))
  ];

  const statusOptions = [
    { value: 'Todos', label: 'Todos los estados' },
    { value: 'ACTIVO', label: 'Activo' },
    { value: 'EN_OFERTA', label: 'En Oferta' },
    { value: 'INACTIVO', label: 'Inactivo' }
  ];

  return (
    <section className="max-w-7xl mx-auto flex flex-col gap-6 mb-12 px-4 sm:px-0">
      {/* Page Content */}
      <div className="flex-1 overflow-y-auto">
        
        {/* Header */}
        <header className="mb-6 flex justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-dark tracking-tight">Inventario</h1>
            <p className="text-slate-mid mt-1 text-sm">Consulta el stock actualizado de todos los productos</p>
          </div>
          <Button
  variant="ghost"
  onClick={() => fetchInventory()}
  disabled={loading}
  className="h-10 w-10 !p-0 shrink-0 border border-light-gray text-slate-600"
  title="Actualizar tabla"
>
  <RefreshCw size={18} />
</Button>
        </header>

        {/* Módulo de Filtros */}
        <form 
          onSubmit={handleSearchSubmit} 
          className="bg-white rounded-xl border border-light-gray p-4 lg:p-6 mb-6 flex flex-col md:flex-row gap-4 items-end"
        >
          <div className="w-full md:flex-1">
            <label className="block text-xs font-semibold text-slate-dark mb-2 uppercase tracking-wider">
              Buscar Producto
            </label>
            <Input
              placeholder="Nombre, SKU o código de barras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              startIcon={<Search size={16} />}
            />
          </div>

          <div className="w-full md:w-48 shrink-0">
            <label className="block text-xs font-semibold text-slate-dark mb-2 uppercase tracking-wider">
              Bodega
            </label>
            <Select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              options={warehouseOptions}
            />
          </div>

          <div className="w-full md:w-48 shrink-0">
            <label className="block text-xs font-semibold text-slate-dark mb-2 uppercase tracking-wider">
              Estado
            </label>
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              options={statusOptions}
            />
          </div>

          <div className="w-full md:w-auto">
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              leftIcon={<Filter size={16} />}
              className="w-full md:w-auto"
            >
              {loading ? 'Buscando...' : 'Filtrar'}
            </Button>
          </div>
        </form>

        {/* Módulo de la Tabla y Tarjetas Mobile */}
        <div className="bg-surface rounded-xl border border-light-gray overflow-hidden">
          
          {/* Banner de Error */}
          {error && (
            <div className="p-4 bg-red-50 border-b border-red-200 text-danger text-sm font-medium flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
              <button onClick={() => fetchInventory()} className="underline text-xs hover:text-red-700">Reintentar</button>
            </div>
          )}

          {loading && inventory.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-mid text-sm">Cargando inventario...</p>
            </div>
          ) : inventory.length === 0 ? (
            <div className="p-12 text-center text-slate-mid text-sm bg-white">
              No se encontraron productos coincidentes en el inventario.
            </div>
          ) : (
            <>
              {/* Vista Desktop/Tablet (Tabla) */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse hidden md:table">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-light-gray">
                      <th className="py-4 px-6 text-[11px] font-bold text-slate-mid uppercase tracking-wider">SKU</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-slate-mid uppercase tracking-wider">Código Barras</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-slate-mid uppercase tracking-wider">Producto</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-slate-mid uppercase tracking-wider">Marca</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-slate-mid uppercase tracking-wider">Bodega</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-slate-mid uppercase tracking-wider text-right">Stock</th>
                      <th className="py-4 px-6 text-[11px] font-bold text-slate-mid uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-gray bg-white text-sm">
                    {inventory.map((item, index) => {
                      const isCritical = item.stock <= item.criticalStock;
                      return (
                        <tr key={`${item.sku}-${item.warehouse}-${index}`} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-6 text-slate-mid font-medium">{item.sku}</td>
                          <td className="py-4 px-6 text-slate-mid font-mono text-xs">{item.barcode}</td>
                          <td className="py-4 px-6 text-dark font-bold">{item.name}</td>
                          <td className="py-4 px-6 text-slate-mid">{item.brand}</td>
                          <td className="py-4 px-6 text-slate-mid">
                            <span className="bg-slate-100 px-2 py-1 rounded text-xs">{item.warehouse}</span>
                          </td>
                          <td className={`py-4 px-6 font-bold text-right text-base ${isCritical ? 'text-danger' : 'text-success'}`}>
                            {item.stock}
                          </td>
                          <td className="py-4 px-6">{getStatusBadge(item.status)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Vista Mobile (Tarjetas) */}
              <div className="flex flex-col divide-y divide-light-gray bg-white md:hidden">
                {inventory.map((item, index) => {
                  const isCritical = item.stock <= item.criticalStock;
                  return (
                    <div key={`${item.sku}-${item.warehouse}-${index}`} className="p-4 flex flex-col gap-3 hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-col">
                          <span className="font-bold text-dark leading-tight">{item.name}</span>
                          <span className="text-xs text-slate-mid mt-1">Marca: {item.brand}</span>
                        </div>
                        <div className="shrink-0">{getStatusBadge(item.status)}</div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-mid font-mono bg-slate-50 p-2 rounded-md border border-light-gray">
                        <span>SKU: {item.sku}</span>
                        <span className="text-slate-300">|</span>
                        <span>{item.barcode}</span>
                      </div>

                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-slate-mid bg-slate-100 px-2 py-1 rounded">
                          Bodega: {item.warehouse}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-mid uppercase tracking-wider font-semibold">Stock:</span>
                          <span className={`font-bold text-lg leading-none ${isCritical ? 'text-danger' : 'text-success'}`}>
                            {item.stock}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Footer / Pagination */}
          <div className="p-4 lg:p-6 border-t border-light-gray bg-white flex flex-col sm:flex-row items-center justify-between text-sm text-slate-mid gap-4">
            <div className="font-medium">{inventory.length} productos encontrados</div>
            <div className="flex items-center space-x-4">
              <span>Página 1 de 1</span>
              <div className="flex space-x-1">
                <button className="w-8 h-8 flex items-center justify-center bg-primary text-white rounded-md font-medium transition-colors hover:bg-primary/90">
                  1
                </button>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}

export default function InventoryPage() {
  return (
    <InventoryProvider>
      <InventoryView />
    </InventoryProvider>
  );
}