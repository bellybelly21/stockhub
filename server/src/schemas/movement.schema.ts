import { z } from 'zod';

export const createMovementSchema = z.object({
  body: z.object({
    type: z.enum(['INGRESO', 'MERMA', 'AJUSTE', 'DONACION', 'TRANSFERENCIA']),
    quantity: z.number().positive('La cantidad debe ser mayor a 0'),
    productId: z.string().uuid('El ID del producto es inválido'),
    fromWarehouseId: z.string().uuid('ID de bodega origen inválido').optional(),
    toWarehouseId: z.string().uuid('ID de bodega destino inválido').optional(),
    reason: z.enum(['DANADO_RECEPCION', 'MERMA_FISICA', 'VENCIMIENTO', 'DONACION', 'OTRO']).optional(),
    comment: z.string().min(5, 'El comentario debe tener al menos 5 caracteres').optional(),
  }).superRefine((data, ctx) => {
    // Validar Origen
    if (['MERMA', 'AJUSTE', 'DONACION', 'TRANSFERENCIA'].includes(data.type) && !data.fromWarehouseId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe especificar la bodega de origen para este tipo de movimiento',
        path: ['fromWarehouseId'],
      });
    }

    // Validar Destino
    if (['INGRESO', 'TRANSFERENCIA'].includes(data.type) && !data.toWarehouseId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe especificar la bodega de destino para este tipo de movimiento',
        path: ['toWarehouseId'],
      });
    }

    // Validar Bodegas Idénticas
    if (data.type === 'TRANSFERENCIA' && data.fromWarehouseId === data.toWarehouseId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La bodega de origen y destino no pueden ser la misma',
        path: ['toWarehouseId'],
      });
    }

    // Validar Justificación
    if (['MERMA', 'AJUSTE'].includes(data.type) && !data.reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe seleccionar un motivo para la merma o ajuste',
        path: ['reason'],
      });
    }
  }),
});