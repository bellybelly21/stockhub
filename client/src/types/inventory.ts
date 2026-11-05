export type ProductStatus = 'ACTIVO' | 'EN_OFERTA' | 'DONADO' | 'INACTIVO';

export interface InventoryItem {
  sku: string;
  barcode: string;
  name: string;
  brand: string;
  warehouse: string;
  stock: number;
  criticalStock: number;
  status: ProductStatus;
}

export interface WarehouseOption {
  id: string;
  name: string;
}

export interface GlobalInventoryApiResponse {
  success: boolean;
  data: InventoryItem[];
  error?: string;
}

export interface WarehousesApiResponse {
  success: boolean;
  data: WarehouseOption[];
  error?: string;
}