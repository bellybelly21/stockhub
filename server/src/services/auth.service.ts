import { Prisma } from '@prisma/client';
import { prisma } from '../db/client';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { invalidateUserStatusCache } from '../middlewares/auth.middleware';

export const BCRYPT_SALT_ROUNDS = 10;

// Hash bcrypt para mitigar timing attacks
const DUMMY_HASH = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

export class AuthService {
  private static sanitizeUser(user: any) {
    return {
      id: user.id,
      rut: user.rut,
      name: user.name,
      email: user.email,
      role: user.role,
      assignedWarehouseId: user.assignedWarehouseId,
    };
  }

  static async revokeUserAccess(userId: string) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          tokenVersion: { increment: 1 },
        },
      }),
      prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true, revokedAt: new Date() },
      }),
    ]);

    invalidateUserStatusCache(userId);
  }

  static async restoreUserAccess(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    invalidateUserStatusCache(userId);
  }

  private static async generateTokens(
    user: any,
    existingAbsoluteExpiresAt?: Date,
    dbClient: Prisma.TransactionClient | typeof prisma = prisma
  ) {
    const accessToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
        assignedWarehouseId: user.assignedWarehouseId,
        tokenVersion: user.tokenVersion,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '15m' }
    );

    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const MAX_SESSION_MS = 12 * 60 * 60 * 1000;
    const now = new Date();
    const absoluteExpiresAt = existingAbsoluteExpiresAt || new Date(now.getTime() + MAX_SESSION_MS);

    await dbClient.refreshToken.create({
      data: {
        tokenHash,
        expiresAt: absoluteExpiresAt,
        absoluteExpiresAt,
        userId: user.id,
      },
    });

    const expiresInMs = absoluteExpiresAt.getTime() - now.getTime();
    return { accessToken, rawRefreshToken, expiresInMs };
  }

  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    const passwordToCompare = user ? user.password : DUMMY_HASH;
    const isPasswordValid = await bcrypt.compare(password, passwordToCompare);

    if (!user || !user.isActive || !isPasswordValid) {
      throw new Error('Credenciales inválidas');
    }

    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
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

    // Ventana de gracia de 5 segundos para peticiones concurrentes legítimas
    const isRecentlyRevoked =
      storedToken.isRevoked &&
      storedToken.revokedAt &&
      now.getTime() - new Date(storedToken.revokedAt).getTime() < 5000;

    if (storedToken.isRevoked) {
      if (isRecentlyRevoked) {
        const accessToken = jwt.sign(
          {
            id: storedToken.user.id,
            role: storedToken.user.role,
            assignedWarehouseId: storedToken.user.assignedWarehouseId,
            tokenVersion: storedToken.user.tokenVersion,
          },
          process.env.JWT_SECRET as string,
          { expiresIn: '15m' }
        );
        return {
          accessToken,
          rawRefreshToken,
          expiresInMs: storedToken.absoluteExpiresAt.getTime() - now.getTime(),
          user: this.sanitizeUser(storedToken.user),
        };
      } else {
        // Reutilización fuera de ventana de gracia: revocación total + limpieza de caché
        await prisma.$transaction([
          prisma.refreshToken.updateMany({
            where: { userId: storedToken.userId, isRevoked: false },
            data: { isRevoked: true, revokedAt: now },
          }),
          prisma.user.update({
            where: { id: storedToken.userId },
            data: { tokenVersion: { increment: 1 } },
          }),
        ]);

        invalidateUserStatusCache(storedToken.userId);
        throw new Error('Alerta de seguridad: Sesión comprometida');
      }
    }

    // Rotación 100% atómica en la misma transacción
    const tokens = await prisma.$transaction(async (tx) => {
      const updated = await tx.refreshToken.updateMany({
        where: { id: storedToken.id, isRevoked: false },
        data: { isRevoked: true, revokedAt: now },
      });

      if (updated.count === 0) {
        throw new Error('Token ya rotado concurrentemente');
      }

      return this.generateTokens(storedToken.user, storedToken.absoluteExpiresAt, tx);
    });

    return {
      ...tokens,
      user: this.sanitizeUser(storedToken.user),
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