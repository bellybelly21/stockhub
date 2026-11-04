import { Prisma } from '@prisma/client';
import { prisma } from '../db/client';
import { CreateUserInput, UpdateUserInput } from '../schemas/user.schema';
import * as bcrypt from 'bcrypt';

export class UserService {
  static async createUser(data: CreateUserInput) {
    // Validar que el email o el RUT no existan previamente
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { rut: data.rut }],
      },
    });

    if (existingUser) {
      if (existingUser.email === data.email) throw new Error('El correo electrónico ya se encuentra registrado');
      if (existingUser.rut === data.rut) throw new Error('El RUT ya se encuentra registrado');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return await prisma.user.create({
      data: {
        rut: data.rut,
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: data.role,
        assignedWarehouseId: data.assignedWarehouseId || null,
        isActive: true,
      },
      select: {
        id: true,
        rut: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        assignedWarehouseId: true,
        createdAt: true,
      },
    });
  }

  static async getAllUsers() {
    return await prisma.user.findMany({
      select: {
        id: true,
        rut: true, 
        email: true,
        name: true,
        role: true,
        isActive: true,
        assignedWarehouse: { select: { id: true, name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async updateUser(id: string, data: UpdateUserInput) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error('Usuario no encontrado');

    let hashedPassword: string | undefined = undefined;
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.role !== undefined && { role: data.role }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.assignedWarehouseId !== undefined && { assignedWarehouseId: data.assignedWarehouseId }),
          ...(hashedPassword !== undefined && { password: hashedPassword }),
        },
        select: {
          id: true,
          rut: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          assignedWarehouseId: true,
        },
      });

      if (data.isActive === false) {
        await tx.refreshToken.updateMany({
          where: { userId: id, isRevoked: false },
          data: { isRevoked: true },
        });
      }

      return updatedUser;
    });
  }

  static async toggleUserStatus(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error('Usuario no encontrado');

    const newStatus = !user.isActive;

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: { isActive: newStatus },
        select: {
          id: true,
          rut: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
        },
      });

      if (!newStatus) {
        await tx.refreshToken.updateMany({
          where: { userId: id, isRevoked: false },
          data: { isRevoked: true },
        });
      }

      return updatedUser;
    });
  }
}