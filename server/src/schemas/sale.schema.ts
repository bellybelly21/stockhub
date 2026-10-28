import { z } from 'zod';

export const createSaleSchema = z.object({
  body: z.object({
    items: z.array(
      z.object({
        productId: z.string().uuid({ message: 'Formato de ID de producto inválido' }),
        quantity: z.number().positive({ message: 'La cantidad debe ser mayor a cero' }),
      })
    ).min(1, { message: 'La venta debe incluir al menos un producto' }),
  }),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>['body'];