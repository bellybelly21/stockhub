import { z } from 'zod';
import { Role } from '@prisma/client';

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email({ message: 'Correo electrónico inválido' }),
    name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres' }),
    password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
    role: z.nativeEnum(Role, { message: 'Rol inválido' }),
    assignedWarehouseId: z.string().uuid({ message: 'ID de bodega inválido' }).optional().nullable(),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'ID de usuario inválido' }),
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    role: z.nativeEnum(Role).optional(),
    assignedWarehouseId: z.string().uuid().optional().nullable(),
    isActive: z.boolean().optional(),
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];