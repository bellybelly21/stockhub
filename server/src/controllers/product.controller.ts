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

  static async getAll(_req: Request, res: Response) {
    try {
      const products = await ProductService.getAllProducts();
      return res.status(200).json({ success: true, data: products });
    } catch (error) {
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

  // Método integrado a la clase y delegado al servicio
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
}