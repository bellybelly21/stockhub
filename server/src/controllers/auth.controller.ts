import { Request, Response } from 'express';
import { prisma } from '../db/client';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // 1. Buscar al usuario
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.isActive) {
        return res.status(401).json({ success: false, error: 'Credenciales inválidas o usuario inactivo' });
      }

      // 2. Verificar la contraseña
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
      }

      // 3. Generar el JWT
      const token = jwt.sign(
        {
          id: user.id,
          role: user.role,
          warehouseId: user.assignedWarehouseId,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: '8h' }
      );

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      });
    } catch (error) {
      console.error('Error en login:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
}