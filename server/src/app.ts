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

// Lista de orígenes permitidos
const allowedOrigins = [
  'http://localhost:5173',
  'https://stockhub-erp.up.railway.app',
  process.env.FRONTEND_URL, // Permite inyectar la URL desde Railway
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permite peticiones sin origin (como Postman o curl) o peticiones desde dominios autorizados
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origen ${origin} no permitido por CORS`));
    }},
  methods: ['GET', 'POST', 'PUT', 'PATCH'], 
  allowedHeaders: ['Content-Type', 'Authorization','Idempotency-Key'],
  credentials: true,
}));

app.use(express.json({ limit: '10kb' })); // Prevención de ataques de payload
app.use(cookieParser());

// Mantiene las optimizaciones de NODE_ENV=production, pero relaja límites si es QA
const isLoadTestEnv = process.env.NODE_ENV !== 'production' || process.env.APP_ENV === 'qa';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isLoadTestEnv ? 1500 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
  message: { success: false, error: 'Demasiadas peticiones. Intente más tarde.' },
});
app.use('/api', limiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isLoadTestEnv ? 10 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, res) => {
    return res.status(429).json({
      success: false,
      error: 'Demasiados intentos fallidos. Por favor, reintenta en 15 minutos.',
    });
  },
});
app.use('/api/auth/login', loginLimiter);

// Rutas
// Healthcheck público para monitoreo y pruebas de carga (JMeter)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api/sales', saleRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/stock', stockRoutes);

// Manejo errores varios
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      success: false,
      error: 'El tamaño de la petición excede el límite permitido (10KB).',
    });
  }

  if (err.message?.includes('no permitido por CORS')) {
    return res.status(403).json({
      success: false,
      error: err.message,
    });
  }

  console.error('[Error Global]:', err);
  return res.status(err.status || 500).json({
    success: false,
    error: 'Error interno del servidor',
  });
});
export default app;