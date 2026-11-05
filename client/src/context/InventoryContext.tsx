import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { InventoryService } from '../services/inventory.service';
import type { InventoryItem, WarehouseOption } from '../types/inventory';
import { useAuth } from './AuthContext';

interface InventoryContextType {
  inventory: InventoryItem[];
  warehouses: WarehouseOption[];
  loading: boolean;
  error: string | null;
  selectedWarehouse: string;
  selectedStatus: string;
  searchTerm: string;
  setSelectedWarehouse: (val: string) => void;
  setSelectedStatus: (val: string) => void;
  setSearchTerm: (val: string) => void;
  fetchInventory: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, accessToken } = useAuth(); // Extraemos user además de accessToken

  // Determinar la bodega inicial según el rol del usuario
  const initialWarehouse = 
    user?.role === 'BODEGUERO' && user.assignedWarehouseId 
      ? user.assignedWarehouseId 
      : 'Todas';

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Inicializamos el estado directamente con la bodega predeterminada
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(initialWarehouse);
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchInventory = useCallback(async () => {
    if (!accessToken) return;

    try {
      setLoading(true);
      setError(null);
      const res = await InventoryService.getGlobalInventory(accessToken, {
        warehouseId: selectedWarehouse,
        status: selectedStatus,
        search: searchTerm,
      });
      setInventory(res.data);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado al consultar el inventario');
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse, selectedStatus, searchTerm, accessToken]);

  // Carga de la lista de bodegas para los `<select>`
  useEffect(() => {
    if (!accessToken) return;

    let isMounted = true;
    InventoryService.getActiveWarehouses(accessToken)
      .then((res) => {
        if (isMounted) setWarehouses(res.data);
      })
      .catch((err) => console.error('Error cargando bodegas:', err));

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  // Ejecuta la búsqueda al cambiar filtros o al montar
  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  return (
    <InventoryContext.Provider
      value={{
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
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory debe ser usado dentro de un InventoryProvider');
  }
  return context;
};