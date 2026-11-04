import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import saleRoutes from './routes/sales.routes';
import authRoutes from './routes/auth.routes'; 
import userRoutes from './routes/user.routes';
import productRoutes from './routes/product.routes';
import movementRoutes from './routes/movement.routes';
import warehouseRoutes from './routes/warehouse.routes';
import stockRoutes from './routes/stock.routes';

const app = express();

app.set('trust proxy', 1); // Permite leer la IP real del usuario en Railway
app.use(helmet());

app.use(cors({
  origin: ['http://localhost:5173', 'https://stockhub-project.up.railway.app'], // Removido el Regex inseguro
  methods: ['GET', 'POST', 'PUT', 'PATCH'], 
  credentials: true,
}));

app.use(express.json({ limit: '10kb' })); // Prevención de ataques de payload
app.use(cookieParser());

// Limitadores de Tasa
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, error: 'Demasiadas peticiones. Intente más tarde.' }
});
app.use('/api', limiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // 100 intentos si estás probando en dev, 5 intentos en producción
  max: process.env.NODE_ENV === 'production' ? 5 : 100, 
  handler: (req, res) => {
    return res.status(429).json({ 
      success: false, 
      error: 'Demasiados intentos fallidos. Por favor, reintenta en 15 minutos.' 
    });
  }
});
app.use('/api/auth/login', loginLimiter);

// Rutas
app.use('/api/sales', saleRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/stock', stockRoutes);

// Manejo de Err
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Error Global]:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

export default app;