import { z } from 'zod';

export const createSaleSchema = z.object({
  body: z.object({
    items: z.array(
      z.object({
        productId: z.string().uuid({ message: "El ID del producto debe ser un UUID válido" }),
        quantity: z.number().positive({ message: "La cantidad debe ser mayor a 0" }),
        unitPrice: z.number().nonnegative({ message: "El precio no puede ser negativo" })
      })
    ).min(1, { message: "La venta debe contener al menos un producto" })
  })
});