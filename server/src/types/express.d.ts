import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      // Sigue siendo opcional porque las rutas públicas no lo tienen
      user?: {
        id: string;
        role: Role;
        assignedWarehouseId: string | null;
      };
    }
  }
}

// Exportamos un tipo utilitario para usar en los controladores autenticados
export interface AuthenticatedRequest extends Express.Request {
  user: {
    id: string;
    role: Role;
    assignedWarehouseId: string | null;
  };
}