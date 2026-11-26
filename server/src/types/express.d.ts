import { Request as ExpressRequest } from 'express';
import { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  role: Role;
  assignedWarehouseId: number | null;
  tokenVersion: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }

    interface Locals {
      validated?: {
        body?: unknown;
        query?: Record<string, unknown>;
        params?: Record<string, unknown>;
        headers?: Record<string, unknown>;
      };
    }
  }
}

// Tipo utilitario para controladores protegidos por requireAuth
export interface AuthenticatedRequest extends ExpressRequest {
  user: AuthUser;
}