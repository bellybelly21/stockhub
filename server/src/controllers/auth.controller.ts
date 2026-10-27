import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/client';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';
const JWT_EXPIRES = '8h'; //Expiración estricta de 8 horas

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Credenciales inválidas o cuenta inactiva' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, warehouseId: user.assignedWarehouseId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    const refreshTokenString = bcrypt.genSaltSync(10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Revoca tokens viejos del usuario y crea el nuevo
    await prisma.$transaction([
      prisma.refreshToken.updateMany({
        where: { userId: user.id, isRevoked: false },
        data: { isRevoked: true }
      }),
      prisma.refreshToken.create({
        data: {
          token: refreshTokenString,
          expiresAt,
          userId: user.id,
        }
      })
    ]);

    res.json({ token, refreshToken: refreshTokenString, role: user.role });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};