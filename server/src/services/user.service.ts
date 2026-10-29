import { prisma } from '../db/client';
import { CreateUserInput, UpdateUserInput } from '../schemas/user.schema';
import * as bcrypt from 'bcrypt';

export class UserService {
  // Crear nuevo usuario
  static async createUser(data: CreateUserInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('El correo electrónico ya se encuentra registrado');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: data.role,
        assignedWarehouseId: data.assignedWarehouseId || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        assignedWarehouseId: true,
        createdAt: true,
      },
    });
  }

  // Listar todos los usuarios
  static async getAllUsers() {
    return await prisma.user.findMany({
      select: {
        id: true,
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

  // Actualizar usuario o dar de baja lógica
  static async updateUser(id: string, data: UpdateUserInput) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error('Usuario no encontrado');

    // Transacción para asegurar revocación de tokens si el usuario pasa a inactivo
    return await prisma.$transaction(async (tx) => {
        const updatedUser = await tx.user.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.role !== undefined && { role: data.role }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
                ...(data.assignedWarehouseId !== undefined && { assignedWarehouseId: data.assignedWarehouseId })},
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          assignedWarehouseId: true,
        },
      });

      // Si se desactiva el usuario, se revocan todos sus Refresh Tokens activamente
      if (data.isActive === false) {
        await tx.refreshToken.updateMany({
          where: { userId: id, isRevoked: false },
          data: { isRevoked: true },
        });
      }

      return updatedUser;
    });
  }
}