import { z } from 'zod';
import { ProductStatus } from '@prisma/client';

export const createProductSchema = z.object({
  body: z.object({
    sku: z.string().min(3, 'El SKU debe tener al menos 3 caracteres'),
    barcode: z.string().min(1, 'El código de barras es obligatorio'),
    name: z.string().min(3, 'El nombre es obligatorio'),
    brand: z.string().min(1, 'La marca es obligatoria'),
    supplier: z.string().min(1, 'El proveedor es obligatorio'),
    unitOfMeasure: z.string().min(1, 'La unidad de medida es obligatoria'),
    weight: z.number().positive('El peso debe ser estrictamente mayor a 0').optional(),
    volume: z.number().positive('El volumen debe ser estrictamente mayor a 0').optional(),
    basePrice: z.number().nonnegative('El precio base no puede ser negativo'),
    criticalStock: z.number().nonnegative('El stock crítico no puede ser negativo'),
    status: z.nativeEnum(ProductStatus).optional(),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de producto inválido'),
  }),
  body: z.object({
    name: z.string().min(3).optional(),
    brand: z.string().optional(),
    supplier: z.string().optional(),
    unitOfMeasure: z.string().optional(),
    weight: z.number().positive('El peso debe ser estrictamente mayor a 0').optional(),
    volume: z.number().positive('El volumen debe ser estrictamente mayor a 0').optional(),
    basePrice: z.number().nonnegative().optional(),
    criticalStock: z.number().nonnegative().optional(),
    status: z.nativeEnum(ProductStatus).optional(),
  }),
});

export type CreateProductInput = z.infer<typeof createProductSchema>['body'];
export type UpdateProductInput = z.infer<typeof updateProductSchema>['body'];