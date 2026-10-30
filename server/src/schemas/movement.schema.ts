import { z } from 'zod';

export const createMovementSchema = z.object({
  body: z.object({
    type: z.enum(['INGRESO', 'MERMA', 'AJUSTE', 'DONACION', 'TRANSFERENCIA']),
    quantity: z.number().positive("La cantidad debe ser mayor a 0"),
    productId: z.string().uuid("El ID del producto es inválido"),
    
    // Bodegas implicadas
    fromWarehouseId: z.string().min(1, 'ID de bodega de origen requerido').optional(),
    toWarehouseId: z.string().min(1, 'ID de bodega de destino requerido').optional(),

    // Justificación para las bajas excepcionales
    reason: z.enum(['DANADO_RECEPCION', 'MERMA_FISICA', 'VENCIMIENTO', 'DONACION', 'OTRO']).optional(),
    comment: z.string().min(5, 'El comentario debe tener al menos 5 caracteres').optional(),
  })
  .refine((data) => {
    if (data.type === 'INGRESO' && !data.toWarehouseId) return false;
    if (['MERMA', 'AJUSTE', 'DONACION'].includes(data.type) && !data.fromWarehouseId) return false;
    if (data.type === 'TRANSFERENCIA' && (!data.fromWarehouseId || !data.toWarehouseId)) return false;
    return true;
  }, {
    message: 'Debe especificar las bodegas de origen/destino correspondientes al tipo de movimiento',
    path: ['toWarehouseId']
  })
  .refine((data) => {
    if (['MERMA', 'AJUSTE'].includes(data.type) && !data.reason) return false;
    return true;
  }, {
    message: 'Debe seleccionar un motivo válido para la merma o ajuste',
    path: ['reason']
  })
});