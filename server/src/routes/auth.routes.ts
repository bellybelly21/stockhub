import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateSchema } from '../middlewares/validate.middleware';
import { loginSchema } from '../schemas/auth.schema'; 

const router = Router();

// Endpoint de login blindado con validación de Zod
router.post('/login', validateSchema(loginSchema), AuthController.login);

export default router;