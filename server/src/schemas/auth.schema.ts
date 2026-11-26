import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email({ message: 'Debe ser un correo electrónico válido' }),
    password: z
      .string()
      .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
      .max(64, { message: 'La contraseña no puede superar los 64 caracteres' }),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];