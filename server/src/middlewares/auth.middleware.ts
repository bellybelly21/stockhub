import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma } from '../db/client';

// Caché en memoria para evitar saturar PostgreSQL
const userStatusCache = new Map<string, { isActive: boolean; tokenVersion: number; cachedAt: number }>();
const CACHE_TTL_MS = 15000; // 15 segundos

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
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
      tokenVersion: number;
    };
    
    const now = Date.now();
    let status = userStatusCache.get(decoded.id);

    // Si no está en caché o la caché expiró, consultamos a la BD
    if (!status || now - status.cachedAt > CACHE_TTL_MS) {
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { isActive: true, tokenVersion: true }
      });

      if (!dbUser) {
        return res.status(401).json({ success: false, error: 'Usuario no existe' });
      }

      status = { isActive: dbUser.isActive, tokenVersion: dbUser.tokenVersion, cachedAt: now };
      userStatusCache.set(decoded.id, status);
    }

    // Validación de revocación inmediata o cuenta desactivada
    if (!status.isActive || status.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ 
        success: false, 
        error: 'Sesión revocada: Su acceso ha sido deshabilitado o la sesión expiró.' 
      });
    }
    
    req.user = {
      id: decoded.id,
      role: decoded.role,
      assignedWarehouseId: decoded.assignedWarehouseId || null,
      tokenVersion: decoded.tokenVersion,
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