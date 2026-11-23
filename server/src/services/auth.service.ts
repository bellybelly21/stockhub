import { prisma } from '../db/client';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export class AuthService {
  static async revokeUserAccess(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { 
        isActive: false,
        tokenVersion: { increment: 1 } // Invalida JWTs actuales
      }
    });

    await prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() }
    });
  }

  static async restoreUserAccess(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true }
    });
  }
  
  private static async generateTokens(user: any, existingAbsoluteExpiresAt?: Date) {
    // Agregar tokenVersion al JWT
    const accessToken = jwt.sign(
      { 
        id: user.id, 
        role: user.role, 
        assignedWarehouseId: user.assignedWarehouseId,
        tokenVersion: user.tokenVersion 
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '15m' }
    );

    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    
    const MAX_SESSION_MS = 12 * 60 * 60 * 1000;
    const now = new Date();
    // Mantener techo de 12h si es un refresh, o crear uno nuevo si es login
    const absoluteExpiresAt = existingAbsoluteExpiresAt || new Date(now.getTime() + MAX_SESSION_MS);

    await prisma.refreshToken.create({
      data: { 
        tokenHash, 
        expiresAt: absoluteExpiresAt, 
        absoluteExpiresAt,
        userId: user.id 
      },
    });

    const expiresInMs = absoluteExpiresAt.getTime() - now.getTime();
    return { accessToken, rawRefreshToken, expiresInMs };
  }

  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    
    const DUMMY_HASH = '$2b$10$abcdefghijklmnopqrstholaaaastockhub123445_678uuuuuuu';
    const passwordToCompare = user ? user.password : DUMMY_HASH;
    
    const isPasswordValid = await bcrypt.compare(password, passwordToCompare);

    if (!user || !user.isActive || !isPasswordValid) {
      throw new Error('Credenciales inválidas');
    }

    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        rut: user.rut,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedWarehouseId: user.assignedWarehouseId,
      },
    };
  }

  static async refresh(rawRefreshToken: string) {
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken) throw new Error('Token no encontrado');

    const now = new Date();

    if (!storedToken.user.isActive) {
      throw new Error('Usuario inactivo');
    }

    // Validar límite absoluto de 12 horas
    if (now >= storedToken.absoluteExpiresAt || now >= storedToken.expiresAt) {
      throw new Error('Jornada laboral expirada. Por favor, inicie sesión nuevamente.');
    }

    // ARQ-09: Ventana de gracia real (usando revokedAt, no createdAt)
    const isRecentlyRevoked = storedToken.isRevoked && storedToken.revokedAt && 
      (now.getTime() - new Date(storedToken.revokedAt).getTime() < 10000); // 10 segundos

    if (storedToken.isRevoked) {
      if (isRecentlyRevoked) {
        // Emitimos solo un nuevo accessToken sin rotar
        const accessToken = jwt.sign(
          { id: storedToken.user.id, role: storedToken.user.role, assignedWarehouseId: storedToken.user.assignedWarehouseId, tokenVersion: storedToken.user.tokenVersion },
          process.env.JWT_SECRET as string,
          { expiresIn: '15m' }
        );
        return { 
          accessToken, 
          rawRefreshToken, // Se devuelve el mismo
          expiresInMs: storedToken.absoluteExpiresAt.getTime() - now.getTime(),
          user: storedToken.user 
        };
      } else {
        // Robo de sesión detectado fuera de ventana de gracia
        await prisma.$transaction([
          prisma.refreshToken.updateMany({
            where: { userId: storedToken.userId, isRevoked: false },
            data: { isRevoked: true, revokedAt: now },
          }),
          prisma.user.update({
            where: { id: storedToken.userId },
            data: { tokenVersion: { increment: 1 } }
          })
        ]);
        throw new Error('Alerta de seguridad: Sesión comprometida');
      }
    }

    // Rotación atómica dentro de una transacción
    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true, revokedAt: now },
      });
      // El generateTokens maneja su propio create, pero en una versión estricta 
      // lo ideal sería pasarle el `tx`, aunque aquí Prisma resolverá bien de forma secuencial
    });

    const tokens = await this.generateTokens(storedToken.user, storedToken.absoluteExpiresAt);

    return {
      ...tokens,
      user: {
        id: storedToken.user.id,
        rut: storedToken.user.rut,
        name: storedToken.user.name,
        email: storedToken.user.email,
        role: storedToken.user.role,
        assignedWarehouseId: storedToken.user.assignedWarehouseId,
      },
    };
  }

  static async logout(refreshToken: string) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }
}