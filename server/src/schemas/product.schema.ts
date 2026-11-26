import { z } from 'zod';
import { ProductStatus } from '@prisma/client';
import { intParamId } from '../validators/common.schema';

export const createProductSchema = z.object({
  body: z.object({
    sku: z.string().trim().min(3, 'El SKU debe tener al menos 3 caracteres'),
    barcode: z.string().trim().min(1, 'El código de barras es obligatorio'),
    name: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres'),
    brand: z.string().trim().min(1, 'La marca es obligatoria'),
    supplier: z.string().trim().min(1, 'El proveedor es obligatorio'),
    unitOfMeasure: z.string().trim().min(1, 'La unidad de medida es obligatoria'),
    weight: z
      .number()
      .positive('El peso debe ser estrictamente mayor a 0')
      .max(9_999_999.999, 'El peso excede el límite permitido')
      .optional(),
    volume: z
      .number()
      .positive('El volumen debe ser estrictamente mayor a 0')
      .max(999_999.9999, 'El volumen excede el límite permitido')
      .optional(),
    basePrice: z
      .number()
      .nonnegative('El precio base no puede ser negativo')
      .max(9_999_999_999.99, 'El precio base excede el límite permitido'),
    criticalStock: z
      .number()
      .nonnegative('El stock crítico no puede ser negativo')
      .max(999_999_999.999, 'El stock crítico excede el límite permitido'),
    status: z.nativeEnum(ProductStatus).optional(),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: intParamId('ID de producto inválido'),
  }),
  body: z.object({
    name: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').optional(),
    brand: z.string().trim().min(1, 'La marca no puede estar vacía').optional(),
    supplier: z.string().trim().min(1, 'El proveedor no puede estar vacío').optional(),
    unitOfMeasure: z.string().trim().min(1, 'La unidad de medida no puede estar vacía').optional(),
    weight: z
      .number()
      .positive('El peso debe ser estrictamente mayor a 0')
      .max(9_999_999.999, 'El peso excede el límite permitido')
      .nullable()
      .optional(),
    volume: z
      .number()
      .positive('El volumen debe ser estrictamente mayor a 0')
      .max(999_999.9999, 'El volumen excede el límite permitido')
      .nullable()
      .optional(),
    basePrice: z
      .number()
      .nonnegative('El precio base no puede ser negativo')
      .max(9_999_999_999.99, 'El precio base excede el límite permitido')
      .optional(),
    criticalStock: z
      .number()
      .nonnegative('El stock crítico no puede ser negativo')
      .max(999_999_999.999, 'El stock crítico excede el límite permitido')
      .optional(),
    status: z.nativeEnum(ProductStatus).optional(),
  }),
});

export type CreateProductInput = z.infer<typeof createProductSchema>['body'];
export type UpdateProductInput = z.infer<typeof updateProductSchema>['body'];
export type UpdateProductParams = z.infer<typeof updateProductSchema>['params'];