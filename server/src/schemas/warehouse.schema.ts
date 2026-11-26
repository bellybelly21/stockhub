import { z } from 'zod';
import { intParamId } from '../validators/common.schema';

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

export const warehouseIdParamSchema = z.object({
  params: z.object({
    id: intParamId('ID de bodega inválido'),
  }),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>['body'];