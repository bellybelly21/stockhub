import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma } from '../db/client';

interface CachedUserStatus {
  isActive: boolean;
  tokenVersion: number;
  role: Role;
  assignedWarehouseId: number | null;
  cachedAt: number;
}

interface JwtPayload {
  id: string;
  role: Role;
  assignedWarehouseId?: number | null;
  tokenVersion: number;
}

const userStatusCache = new Map<string, CachedUserStatus>();
const CACHE_TTL_MS = 15_000; // 15 segundos

export const invalidateUserStatusCache = (userId: string): void => {
  userStatusCache.delete(userId);
};

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Acceso denegado: Token no proporcionado o formato inválido',
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ success: false, error: 'Acceso denegado: Token malformado' });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    next(new Error('JWT_SECRET no está configurado en las variables de entorno'));
    return;
  }

  // 1. Solo errores de firma/expiración del JWT devuelven 401
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, jwtSecret) as JwtPayload;
  } catch {
    res.status(401).json({ success: false, error: 'Token inválido o expirado' });
    return;
  }

  // 2. Errores de PostgreSQL/Prisma se delegan al errorHandler global (500), no a 401
  try {
    const now = Date.now();
    let status = userStatusCache.get(decoded.id);

    if (!status || now - status.cachedAt > CACHE_TTL_MS) {
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          isActive: true,
          tokenVersion: true,
          role: true,
          assignedWarehouseId: true,
        },
      });

      if (!dbUser) {
        res.status(401).json({ success: false, error: 'Usuario no existe' });
        return;
      }

      status = {
        isActive: dbUser.isActive,
        tokenVersion: dbUser.tokenVersion,
        role: dbUser.role,
        assignedWarehouseId: dbUser.assignedWarehouseId,
        cachedAt: now,
      };
      userStatusCache.set(decoded.id, status);
    }

    if (!status.isActive || status.tokenVersion !== decoded.tokenVersion) {
      res.status(401).json({
        success: false,
        error: 'Sesión revocada: Su acceso ha sido deshabilitado o la sesión expiró.',
      });
      return;
    }

    req.user = {
      id: decoded.id,
      role: status.role,
      assignedWarehouseId: status.assignedWarehouseId,
      tokenVersion: status.tokenVersion,
    };
  } catch (error) {
    next(error);
    return;
  }

  // 3. Siempre fuera del try/catch
  next();
};

export const requireRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Acceso denegado por falta de permisos',
      });
      return;
    }
    next();
  };
};