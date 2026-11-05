import React from 'react';
import { Search, Filter, ChevronDown, RefreshCw } from 'lucide-react';
import { useInventory, InventoryProvider } from '../context/InventoryContext';
import type { ProductStatus } from '../types/inventory';

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
        return <span className="px-3 py-1 bg-success-bg text-success rounded-full text-xs font-medium">Activo</span>;
      case 'EN_OFERTA':
        return <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">En Oferta</span>;
      case 'INACTIVO':
        return <span className="px-3 py-1 bg-gray-100 text-dark-different rounded-full text-xs font-medium">Inactivo</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-dark-different rounded-full text-xs font-medium">{status}</span>;
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInventory();
  };

  return (
      <section className="max-w-7xl mx-auto flex flex-col gap-6 mb-12">
        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-dark tracking-tight">Inventario</h1>
              <p className="text-slate-mid mt-1 text-sm">Consulta el stock actualizado de todos los productos</p>
            </div>
            {/* Botón opcional de recarga rápida con indicador visual */}
            <button
              onClick={() => fetchInventory()}
              disabled={loading}
              className="p-2 text-slate-mid hover:text-dark rounded-lg transition-colors"
              title="Actualizar tabla"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Módulo de Filtros Separado */}
          <form 
            onSubmit={handleSearchSubmit} 
            className="bg-white rounded-xl border border-light-gray p-4 lg:p-6 mb-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-end"
          >
            <div className="md:col-span-6">
              <label className="block text-xs font-semibold text-slate-dark mb-2">Buscar</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-slate-light" />
                </div>
                <input
                  type="text"
                  placeholder="Nombre, SKU o código de barras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-light-gray rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-dark mb-2">Bodega</label>
              <div className="relative">
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full appearance-none bg-white border border-light-gray rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Todas">Todas</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-3 text-slate-mid pointer-events-none" />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-dark mb-2">Estado</label>
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full appearance-none bg-white border border-light-gray rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Todos">Todos</option>
                  <option value="ACTIVO">Activo</option>
                  <option value="EN_OFERTA">En Oferta</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-3 text-slate-mid pointer-events-none" />
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg flex items-center justify-center space-x-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Filter size={16} />
                <span>{loading ? 'Cargando...' : 'Buscar'}</span>
              </button>
            </div>
          </form>

          {/* Módulo de la Tabla */}
          <div className="bg-white rounded-xl border border-light-gray overflow-hidden">
            {/* Banner de Error */}
            {error && (
              <div className="p-4 bg-red-50 border-b border-red-200 text-danger text-sm font-medium flex justify-between items-center">
                <span>{error}</span>
                <button onClick={() => fetchInventory()} className="underline text-xs">Reintentar</button>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-250">
                <thead>
                  <tr className="border-b border-light-gray">
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-mid uppercase tracking-wider">SKU</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-mid uppercase tracking-wider">Código Barras</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-mid uppercase tracking-wider">Producto</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-mid uppercase tracking-wider">Marca</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-mid uppercase tracking-wider">Bodega</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-mid uppercase tracking-wider text-right">Stock</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-mid uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && inventory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-mid text-sm">
                        Cargando productos de la base de datos...
                      </td>
                    </tr>
                  ) : inventory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-mid text-sm">
                        No se encontraron productos coincidentes en el inventario.
                      </td>
                    </tr>
                  ) : (
                    inventory.map((item, index) => {
                      const isCritical = item.stock <= item.criticalStock;
                      return (
                        <tr key={`${item.sku}-${item.warehouse}-${index}`} className="hover:bg-canvas transition-colors group">
                          <td className="py-4 px-6 text-sm text-slate-mid">{item.sku}</td>
                          <td className="py-4 px-6 text-sm text-slate-mid font-mono">{item.barcode}</td>
                          <td className="py-4 px-6 text-sm text-dark font-bold">{item.name}</td>
                          <td className="py-4 px-6 text-sm text-slate-mid">{item.brand}</td>
                          <td className="py-4 px-6 text-sm text-slate-mid">{item.warehouse}</td>
                          <td className={`py-4 px-6 text-sm font-bold text-right ${isCritical ? 'text-danger' : 'text-success'}`}>
                            {item.stock}
                          </td>
                          <td className="py-4 px-6 text-sm">{getStatusBadge(item.status)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer / Pagination */}
            <div className="p-4 lg:p-6 border-t border-light-gray flex flex-col sm:flex-row items-center justify-between text-sm text-slate-mid gap-4">
              <div>{inventory.length} productos encontrados</div>
              <div className="flex items-center space-x-4">
                <span>Página 1 de 1</span>
                <div className="flex space-x-1">
                  <button className="w-8 h-8 flex items-center justify-center bg-primary text-white rounded-md font-medium">1</button>
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