import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { blacklistedUsers } from '../services/auth.service';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Acceso denegado: Token no proporcionado o formato inválido' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Acceso denegado: Token malformado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
      role: Role;
      assignedWarehouseId?: string | null;
    };
    
    // VALIDACIÓN DE REVOCACIÓN INMEDIATA (BLACKLIST)
    if (blacklistedUsers.has(decoded.id)) {
      return res.status(401).json({ 
        success: false, 
        error: 'Sesión revocada: Su acceso ha sido deshabilitado por un administrador.' 
      });
    }
    
    req.user = {
      id: decoded.id,
      role: decoded.role,
      assignedWarehouseId: decoded.assignedWarehouseId || null,
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