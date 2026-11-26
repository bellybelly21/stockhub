import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { InventoryService } from '../services/inventory.service';
import type { InventoryItem, WarehouseOption } from '../types/inventory';
import { useAuth } from './AuthContext';

const SEARCH_DEBOUNCE_MS = 350;

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
  const { user, accessToken } = useAuth();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(() =>
    user?.role === 'BODEGUERO' && user.assignedWarehouseId
      ? user.assignedWarehouseId
      : 'Todas'
  );
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  const initializedForUserId = useRef<string | null>(user?.id ?? null);

  // Sincroniza la bodega inicial cuando `user` carga después del primer render
  useEffect(() => {
    if (!user || initializedForUserId.current === user.id) return;

    initializedForUserId.current = user.id;
    const defaultWarehouse =
      user.role === 'BODEGUERO' && user.assignedWarehouseId
        ? user.assignedWarehouseId
        : 'Todas';

    setSelectedWarehouse(defaultWarehouse);
  }, [user]);

  // Debounce de búsqueda para evitar 1 request por tecla
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchInventory = useCallback(async () => {
    if (!accessToken) return;

    try {
      setLoading(true);
      setError(null);
      const res = await InventoryService.getGlobalInventory(accessToken, {
        warehouseId: selectedWarehouse,
        status: selectedStatus,
        search: debouncedSearch,
      });
      setInventory(res.data);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Ocurrió un error inesperado al consultar el inventario';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse, selectedStatus, debouncedSearch, accessToken]);

  // Carga de la lista de bodegas para los <select>
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

  // Ejecuta la búsqueda al cambiar filtros o el término con debounce
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