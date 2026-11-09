import { prisma } from '../db/client';
import { ProductStatus, Prisma } from '@prisma/client';
import { CreateProductInput, UpdateProductInput } from '../schemas/product.schema';

// Interfaz para recibir los parámetros que enviará el frontend
export interface GetProductsQuery {
  limit?: number;
  cursor?: string;
  search?: string;
  status?: ProductStatus;
  warehouseId?: string;
}

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

  static async getProducts(query: GetProductsQuery = {}) {
    const take = Number(query.limit) || 20; // Por defecto 20 registros
    const { cursor, search, status, warehouseId } = query;

    const where: Prisma.ProductWhereInput = {};

    // Buscador por Nombre, SKU o Código de barras (Insensible a mayúsculas/minúsculas)
    if (search && search.trim() !== '') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filtro por Estado
    if (status) {
      where.status = status;
    }

    // Filtro por Bodega específica
    if (warehouseId && warehouseId !== 'Todas') {
      where.stocks = {
        some: {
          warehouseId: warehouseId,
        },
      };
    }

    // Consulta a PostgreSQL con Prisma
    const products = await prisma.product.findMany({
      take,
      skip: cursor ? 1 : 0, // Si viene cursor, salta el registro límite actual
      ...(cursor && {
        cursor: { id: cursor },
      }),
      where,
      include: {
        stocks: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });

    const nextCursor = products.length === take ? products[products.length - 1]?.id : null;

    return {
      data: products,
      nextCursor,
    };
  }

  static async getProductById(id: string) {
    const product = await prisma.product.findUnique({ 
      where: { id },
      include: { stocks: { include: { warehouse: true } } }
    });
    
    if (!product) throw new Error('Producto no encontrado');
    
    return product;
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
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new Error('Producto no encontrado');
  
    return await prisma.product.update({
      where: { id },
      data: { status: ProductStatus.INACTIVO },
    });
  }

  static async findByCodeOrSku(code: string, warehouseId?: string) {
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { barcode: code },
          { sku: code }
        ]
      },
      include: {
        stocks: warehouseId ? { where: { warehouseId } } : true
      }
    });
  
    if (!product) return null;
  
    const currentStock = warehouseId 
      ? product.stocks.find(s => s.warehouseId === warehouseId)?.quantity || 0
      : product.stocks.reduce((acc, s) => acc + Number(s.quantity), 0);
  
    return {
      ...product,
      stock: Number(currentStock)
    };
  }
}