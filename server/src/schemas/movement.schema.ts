import { z } from 'zod';
import { intId } from '../validators/common.schema';

export const createMovementSchema = z.object({
  body: z
    .object({
      type: z.enum(['INGRESO', 'MERMA', 'AJUSTE', 'DONACION', 'TRANSFERENCIA_SALIDA']),
      quantity: z
        .number({ message: 'La cantidad debe ser un número' })
        .min(-999_999_999.999, 'La cantidad está fuera del rango permitido')
        .max(999_999_999.999, 'La cantidad está fuera del rango permitido')
        .refine((val) => val !== 0, { message: 'La cantidad no puede ser 0' }),
      unitCost: z
        .number({ message: 'El costo unitario debe ser un número' })
        .nonnegative('El costo unitario no puede ser negativo')
        .max(9_999_999_999.99, 'El costo unitario excede el límite permitido')
        .optional(),
      productId: intId('El ID del producto es inválido'),
      fromWarehouseId: intId('ID de bodega origen inválido').optional(),
      toWarehouseId: intId('ID de bodega destino inválido').optional(),
      reason: z
        .enum(['DANADO_RECEPCION', 'MERMA_FISICA', 'VENCIMIENTO', 'DONACION', 'OTRO'])
        .optional(),
      comment: z
        .string()
        .trim()
        .min(5, 'El comentario debe tener al menos 5 caracteres')
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (data.type !== 'AJUSTE' && data.quantity < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Solo los ajustes permiten cantidades negativas',
          path: ['quantity'],
        });
      }

      if (
        ['MERMA', 'AJUSTE', 'DONACION', 'TRANSFERENCIA_SALIDA'].includes(data.type) &&
        !data.fromWarehouseId
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Debe especificar la bodega de origen para este tipo de movimiento',
          path: ['fromWarehouseId'],
        });
      }

      if (['INGRESO', 'TRANSFERENCIA_SALIDA'].includes(data.type) && !data.toWarehouseId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Debe especificar la bodega de destino para este tipo de movimiento',
          path: ['toWarehouseId'],
        });
      }

      if (data.type === 'TRANSFERENCIA_SALIDA' && data.fromWarehouseId === data.toWarehouseId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'La bodega de origen y destino no pueden ser la misma',
          path: ['toWarehouseId'],
        });
      }

      if (['MERMA', 'AJUSTE'].includes(data.type) && !data.reason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Debe seleccionar un motivo para la merma o ajuste',
          path: ['reason'],
        });
      }
    }),
});

export type CreateMovementInput = z.infer<typeof createMovementSchema>['body'];