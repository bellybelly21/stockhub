import { Request, Response } from 'express';
import { prisma } from '../db/client';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Buscar al usuario
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.isActive) {
        return res.status(401).json({ success: false, error: 'Credenciales inválidas o usuario inactivo' });
      }

      // Verificar la contraseña
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
      }

      // Generar el Access Token (Vida 15 minutos)
      const accessToken = jwt.sign(
        {
          id: user.id,
          role: user.role,
          warehouseId: user.assignedWarehouseId,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: '15m' }
      );

      // Generar el Refresh Token bruto (random bytes de 64 caracteres)
      const rawRefreshToken = crypto.randomBytes(32).toString('hex');

      // Generar el Hash SHA-256 para guardarlo de forma segura en la BD
      const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

      // Calcular expiración a 7 días
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Guardar el hash en el modelo RefreshToken
      await prisma.refreshToken.create({
        data: {
          tokenHash,
          expiresAt,
          userId: user.id,
        },
      });

      // Devolver el Access Token y el Refresh Token crudo al cliente
      return res.status(200).json({
        success: true,
        accessToken,
        refreshToken: rawRefreshToken, // El cliente recibe la versión sin hashear
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Error en login:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
}