import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import saleRoutes from './routes/sales.routes';
import authRoutes from './routes/auth.routes'; 
import userRoutes from './routes/user.routes';
import productRoutes from './routes/product.routes';
import movementRoutes from './routes/movement.routes';
import warehouseRoutes from './routes/warehouse.routes';
import stockRoutes from './routes/stock.routes';

const app = express();

// 1. Middlewares Globales y de Seguridad
app.use(helmet());

app.use(cors({
  // Permite localhost, tu dominio, y cualquier subdominio temporal de Railway
  origin: ['http://localhost:5173', 'https://stockhub-project.up.railway.app', /\.railway\.app$/],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.use(express.json());

// 2. Limitadores de Tasa
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, error: 'Demasiadas peticiones. Intente más tarde.' }
});
app.use('/api', limiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Demasiados intentos de login. Cuenta bloqueada temporalmente.' }
});
app.use('/api/auth/login', loginLimiter);

// 3. Registro de Rutas
app.use('/api/sales', saleRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/stock', stockRoutes);

// 4. Manejo de Errores Globales
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Error Global]:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

export default app;