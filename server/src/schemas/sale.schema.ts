import { z } from 'zod';
import { intId } from '../validators/common.schema';

export const createSaleSchema = z.object({
  headers: z
    .object({
      'idempotency-key': z.string().trim().min(1, 'El header Idempotency-Key es obligatorio'),
    })
    .passthrough(),
  body: z.object({
    warehouseId: intId('ID de bodega inválido').optional(),
    items: z
      .array(
        z.object({
          productId: intId('Formato de ID de producto inválido'),
          quantity: z
            .number()
            .positive('La cantidad debe ser mayor a cero')
            .max(999_999_999.999, 'La cantidad excede el límite permitido'),
          expectedPrice: z
            .number()
            .positive('El precio esperado debe ser mayor a cero')
            .max(9_999_999_999.99, 'El precio excede el límite permitido'),
        })
      )
      .min(1, { message: 'La venta debe incluir al menos un producto' })
      .refine((items) => new Set(items.map((i) => i.productId)).size === items.length, {
        message: 'No puedes repetir el mismo producto en la venta; suma sus cantidades',
      }),
  }),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>['body'];