import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        warehouseId: string | null;
        role: Role;
      };
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  // Validación estricta del formato Bearer
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Acceso denegado: Token no proporcionado o formato inválido' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Acceso denegado: Token malformado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as unknown as {
      id: string;
      role: Role;
      warehouseId?: string | null;
    };
    
    req.user = {
      id: decoded.id,
      role: decoded.role,
      warehouseId: decoded.warehouseId || null,
    };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Token inválido o expirado' });
  }
};

export const requireRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Acceso denegado por falta de permisos' });
    }
    next();
  };
};