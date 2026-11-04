import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email({ message: "Debe ser un correo electrónico válido" }).toLowerCase().trim(),
    password: z.string()
      .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
      .max(64, { message: "La contraseña es demasiado larga" })
  })
});