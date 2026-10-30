import { prisma } from '../db/client';
import { CreateProductInput, UpdateProductInput } from '../schemas/product.schema';

export class ProductService {
  static async createProduct(data: CreateProductInput) {
    const existingSku = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (existingSku) throw new Error('El SKU ya existe en el catálogo');

    const existingBarcode = await prisma.product.findUnique({ where: { barcode: data.barcode } });
    if (existingBarcode) throw new Error('El código de barras ya está registrado');

    return await prisma.product.create({
      data: {
        sku: data.sku,
        barcode: data.barcode,
        name: data.name,
        brand: data.brand,
        supplier: data.supplier,
        unitOfMeasure: data.unitOfMeasure,
        basePrice: data.basePrice,
        criticalStock: data.criticalStock,
        ...(data.weight !== undefined && { weight: data.weight }),
        ...(data.volume !== undefined && { volume: data.volume }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });
  }

  static async getAllProducts() {
    return await prisma.product.findMany({
      orderBy: { name: 'asc' },
    });
  }

  static async updateProduct(id: string, data: UpdateProductInput) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new Error('Producto no encontrado');

    return await prisma.product.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.brand !== undefined && { brand: data.brand }),
        ...(data.supplier !== undefined && { supplier: data.supplier }),
        ...(data.unitOfMeasure !== undefined && { unitOfMeasure: data.unitOfMeasure }),
        ...(data.weight !== undefined && { weight: data.weight }),
        ...(data.volume !== undefined && { volume: data.volume }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.criticalStock !== undefined && { criticalStock: data.criticalStock }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });
  }

  static async deactivateProduct(id: string) {
    return await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }
}