import { prisma } from '../db/client';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Instanciamos la lista negra en memoria
export const blacklistedUsers = new Set<string>();

export class AuthService {
  // Método para cargar usuarios inactivos al iniciar el servidor
  static async initializeBlacklist() {
    const inactiveUsers = await prisma.user.findMany({ 
      where: { isActive: false }, 
      select: { id: true } 
    });
    inactiveUsers.forEach(user => blacklistedUsers.add(user.id));
  }

  // El método que el Admin llamará para dar la baja inmediata
  static async revokeUserAccess(userId: string) {
    // Inactiva al usuario en la BD
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false }
    });

    // Invalida todos sus Refresh Tokens (mata sesiones futuras)
    await prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true }
    });

    // Agrega a la lista negra en memoria (mata Access Tokens activos instantáneamente)
    blacklistedUsers.add(userId);
  }

  // Por si el Admin decide reactivar al trabajador
  static async restoreUserAccess(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true }
    });
    blacklistedUsers.delete(userId);
  }
  private static async generateTokens(user: any) {
    const accessToken = jwt.sign(
      { id: user.id, role: user.role, warehouseId: user.assignedWarehouseId },
      process.env.JWT_SECRET as string,
      { expiresIn: '15m' }
    );

    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + EIGHT_HOURS_MS);

    await prisma.refreshToken.create({
      data: { tokenHash, expiresAt, userId: user.id },
    });

    return { accessToken, rawRefreshToken, EIGHT_HOURS_MS };
  }

  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    
    // Prevención de ataques de enumeración por tiempo
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

    // Ventana de gracia de 10 segundos para concurrencia o StrictMode
    const GRACE_PERIOD_MS = 10 * 1000;
    const isRecentlyRevoked = storedToken.isRevoked && 
      (Date.now() - new Date(storedToken.createdAt).getTime() < GRACE_PERIOD_MS);

    // Prevención de reuso de tokens 
    if (storedToken.isRevoked && !isRecentlyRevoked) {
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId, isRevoked: false },
        data: { isRevoked: true },
      });
      throw new Error('Alerta de seguridad: Sesión comprometida');
    }

    if (storedToken.expiresAt < new Date() || !storedToken.user.isActive) {
      throw new Error('Token expirado o usuario inactivo');
    }

    // Rotación del token usado 
    if (!storedToken.isRevoked) {
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      });
    }

    const tokens = await this.generateTokens(storedToken.user);

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
      data: { isRevoked: true },
    });
  }
}