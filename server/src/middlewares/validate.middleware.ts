import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validateSchema = (schema: ZodSchema) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Error de validación de datos',
          details: error.issues.map(e => ({ campo: e.path.join('.'), mensaje: e.message }))
        });
      }
      return res.status(400).json({ 
        success: false, 
        error: 'Error de validación desconocido' 
      });
    }
  };