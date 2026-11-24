import { z } from 'zod';

export const createWarehouseSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, 'El nombre de la bodega debe tener al menos 2 caracteres')
      .max(100, 'El nombre no puede superar los 100 caracteres'),
      location: z.preprocess(
        (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
        z.string().trim().min(2, 'La ubicación debe tener al menos 2 caracteres').max(200).optional()
      ),
  }),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>['body'];