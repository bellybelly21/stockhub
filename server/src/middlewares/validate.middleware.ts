import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validateSchema =
  (schema: ZodSchema) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = (await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        headers: req.headers,
      })) as {
        body?: unknown;
        query?: Record<string, unknown>;
        params?: Record<string, unknown>;
        headers?: Record<string, unknown>;
      };

      // Disponible con tipos limpios (útil para Express 5 y params numéricos)
      res.locals.validated = validatedData;

      if (validatedData.body !== undefined) {
        req.body = validatedData.body;
      }
      if (validatedData.params !== undefined) {
        req.params = validatedData.params as Request['params'];
      }
      if (validatedData.query !== undefined) {
        try {
          Object.assign(req.query, validatedData.query);
        } catch {
          // En Express 5 req.query es de solo lectura: leer desde res.locals.validated.query
        }
      }
      if (validatedData.headers !== undefined) {
        Object.assign(req.headers, validatedData.headers);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Error de validación de datos',
          details: error.issues.map((e) => ({
            campo: e.path.join('.'),
            mensaje: e.message,
          })),
        });
        return;
      }
      next(error);
      return;
    }

    // Siempre fuera del try/catch para no capturar errores del controlador
    next();
  };