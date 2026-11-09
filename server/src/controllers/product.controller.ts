import { Request, Response } from 'express';
import { ProductService } from '../services/product.service';

export class ProductController {
  static async create(req: Request, res: Response) {
    try {
      const product = await ProductService.createProduct(req.body);
      return res.status(201).json({ success: true, data: product });
    } catch (error: any) {
      if (error.message.includes('ya existe') || error.message.includes('registrado')) {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async getAll(req: Request, res: Response) {
    try {
      const { limit, cursor, search, status, warehouseId } = req.query;

      const result = await ProductService.getProducts({
        limit: limit ? Number(limit) : 20,
        cursor: cursor as string,
        search: search as string,
        status: status as any,
        warehouseId: warehouseId as string,
      });

      return res.status(200).json({ 
        success: true, 
        data: result.data,
        nextCursor: result.nextCursor 
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const product = await ProductService.getProductById(id);
      
      return res.status(200).json({ success: true, data: product });
    } catch (error: any) {
      if (error.message.includes('no encontrado')) {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const product = await ProductService.updateProduct(id, req.body);
      return res.status(200).json({ success: true, data: product });
    } catch (error: any) {
      if (error.message.includes('no encontrado')) {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const deletedProduct = await ProductService.deactivateProduct(id);
      
      return res.json({ 
        success: true, 
        message: 'Producto desactivado correctamente',
        data: deletedProduct 
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'Error al desactivar el producto' });
    }
  }

  static async searchByCode(req: Request, res: Response) {
    try {
      const { code, warehouseId } = req.query;
  
      if (!code) {
        return res.status(400).json({ success: false, error: 'Código de barras o SKU requerido' });
      }
  
      const product = await ProductService.findByCodeOrSku(String(code), String(warehouseId || ''));
  
      if (!product) {
        return res.status(404).json({ success: false, error: 'Producto no encontrado en el catálogo' });
      }
  
      return res.status(200).json({ success: true, data: product });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Error interno al buscar el producto' });
    }
  }
}