import { z } from 'zod';
import { Role } from '@prisma/client';

export const createUserSchema = z.object({
  body: z.object({
    rut: z.string().regex(/^[0-9]+-[0-9kK]{1}$/, { message: 'Formato de RUT inválido (ej: 12345678-9)' }),
    email: z.string().email({ message: 'Correo electrónico inválido' }),
    name: z.string().min(2).max(100, { message: 'El nombre debe tener al menos 2 caracteres' }),
    password: z.string().min(8).max(100, { message: 'La contraseña debe tener al menos 8 caracteres' }),
    role: z.nativeEnum(Role, { message: 'Rol inválido' }),
    assignedWarehouseId: z.string().optional().nullable().transform(val => val === '' ? null : val),
    isActive: z.boolean().optional(),
  }).refine(data => {
    // Si es Vendedor o Bodeguero, debe tener bodega asignada
    if ((data.role === Role.VENDEDOR || data.role === Role.BODEGUERO) && !data.assignedWarehouseId) {
      return false;
    }
    return true;
  }, { 
    message: "Los Vendedores y Bodegueros deben tener una bodega asignada", 
    path: ["assignedWarehouseId"] 
  }),
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string({ message: 'ID de usuario inválido' }),
  }),
  body: z.object({
    name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres' }).optional(),
    password: z.string().min(8).max(100, { message: 'La contraseña debe tener al menos 8 caracteres' }).optional(),
    role: z.nativeEnum(Role).optional(),
    assignedWarehouseId: z.string().optional().nullable().transform(val => val === '' ? null : val),
    isActive: z.boolean().optional(),
  },),
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body']; 