import { prisma } from '../db/client';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export class AuthService {
  // Función auxiliar privada para evitar duplicar código
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
  const DUMMY_HASH = '$2b$10$abcdefghijklmnopqrstholaaaastockhub123445_678uuuuuuu';

  const passwordToCompare = user ? user.password : DUMMY_HASH;
  const isPasswordValid = await bcrypt.compare(password, passwordToCompare);

  if (!user || !user.isActive || !isPasswordValid) {
    throw new Error('Credenciales inválidas');
  }
    if (!isPasswordValid) {
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

    // Prevención de reuso de tokens
    if (storedToken.isRevoked) {
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
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

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