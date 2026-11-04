export type Role = 'ADMIN' | 'VENDEDOR' | 'BODEGUERO';

export interface User {
  id: string;
  run: string; 
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  assignedWarehouse?: { id: string; name: string } | null;
  assignedWarehouseId?: string | null;
  createdAt: string; 
}

export interface CreateUserData {
  run: string; 
  name: string;
  email: string;
  password?: string; 
  confirmPassword?: string;
  role: Role;
  assignedWarehouseId?: string | null;
}