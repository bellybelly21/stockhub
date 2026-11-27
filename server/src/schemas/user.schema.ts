import { z } from 'zod';
import { Role } from '@prisma/client';
import { nullableIntId } from '../validators/common.schema';

export const createUserSchema = z.object({
  body: z
    .object({
      rut: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[0-9]+-[0-9K]{1}$/, {
          message: 'Formato de RUT inválido (ej: 12345678-9)',
        }),
      email: z.string().trim().toLowerCase().email({ message: 'Correo electrónico inválido' }),
      name: z
        .string()
        .trim()
        .min(2, { message: 'El nombre debe tener al menos 2 caracteres' })
        .max(100, { message: 'El nombre no puede superar los 100 caracteres' }),
      password: z
        .string()
        .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
        .max(64, { message: 'La contraseña no puede superar los 64 caracteres' }),
      role: z.nativeEnum(Role, { message: 'Rol inválido' }),
      assignedWarehouseId: nullableIntId('ID de bodega inválido'),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Boolean(data.assignedWarehouseId), {
      message: 'Todos los usuarios deben tener una bodega asignada',
      path: ['assignedWarehouseId'],
    }),
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'ID de usuario inválido' }),
  }),
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(2, { message: 'El nombre debe tener al menos 2 caracteres' })
        .max(100, { message: 'El nombre no puede superar los 100 caracteres' })
        .optional(),
      password: z
        .string()
        .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
        .max(64, { message: 'La contraseña no puede superar los 64 caracteres' })
        .optional(),
      role: z.nativeEnum(Role, { message: 'Rol inválido' }).optional(),
      assignedWarehouseId: nullableIntId('ID de bodega inválido'),
      isActive: z.boolean().optional(),
    })
    .refine((data) => data.assignedWarehouseId !== null, {
      message: 'Todos los usuarios deben tener una bodega asignada',
      path: ['assignedWarehouseId'],
    }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];