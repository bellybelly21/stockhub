import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

import saleRoutes from './routes/sales.routes';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import productRoutes from './routes/product.routes';
import movementRoutes from './routes/movement.routes';
import warehouseRoutes from './routes/warehouse.routes';
import stockRoutes from './routes/stock.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reportRoutes from './routes/report.routes';

const app = express();

// ============================================================================
// DETECCIÓN DE ENTORNO (Local, Railway QA y Railway Producción)
// ============================================================================
const isQA = process.env.APP_ENV === 'qa';
const isLocal = process.env.NODE_ENV !== 'production';
const isLoadTestEnv = isLocal || isQA;

// Confianza en proxy inverso (Railway / Cloudflare) para leer X-Forwarded-For real
app.set('trust proxy', 1);
app.use(helmet());

// ============================================================================
// HEALTHCHECK (Antes de CORS y Rate Limit para monitoreo interno de Railway)
// ============================================================================
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// CONFIGURACIÓN CORS ÚNICA
// ============================================================================
const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://stockhub-erp.up.railway.app',
  'https://stockhub-frontend-qa.up.railway.app',
  frontendUrl,
].filter((origin): origin is string => Boolean(origin));

app.use(
  cors({
    origin: (origin, callback) => {
      // Peticiones sin cabecera Origin (JMeter, Postman, curl): permitidas solo en Local y QA
      if (!origin) {
        if (isLocal || isQA) return callback(null, true);
        return callback(new Error('Origen no permitido por CORS (Falta cabecera Origin)'));
      }

      // Navegadores: valida contra lista blanca o cualquier subdominio en QA
      if (allowedOrigins.includes(origin) || isQA) {
        return callback(null, true);
      }

      return callback(new Error(`Origen ${origin} no permitido por CORS`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Idempotency-Key'],
    credentials: true,
  })
);

const jsonParserStandard = express.json({ limit: '20kb' });
const jsonParserLarge = express.json({ limit: '1mb' });

app.use(cookieParser());

// ============================================================================
// Defensa DoS gruesa por IP (Soporta múltiples POS tras NAT)
// ============================================================================
const globalIpLimiter = rateLimit({
  windowMs: 60 * 1000, // Ventana de 1 minuto
  max: isLoadTestEnv ? 5000 : 1000, // >= 1.000 req/min por IP pública
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
  message: { success: false, error: 'Tráfico anómalo detectado desde esta red. Intente en un minuto.' },
});
app.use('/api', globalIpLimiter);

// ============================================================================
// Cuota operativa por Usuario Autenticado (300 req/min por userId)
// ============================================================================
const userApiLimiter = rateLimit({
  windowMs: 60 * 1000, // Ventana de 1 minuto
  max: isLoadTestEnv ? 3000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  skip: (req) => req.path === '/health' || req.path === '/auth/login',
  keyGenerator: (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          const decoded = jwt.decode(token) as { id?: string; sub?: string } | null;
          const uid = decoded?.id || decoded?.sub;
          if (uid) return `user:${uid}`;
        } catch {
          // Si el token es inválido, cae al fallback por IP
        }
      }
    }
    return `ip:${req.ip}`;
  },
  message: { success: false, error: 'Límite de peticiones por usuario excedido (300 req/min).' },
});
app.use('/api', userApiLimiter);

// ============================================================================
// Protección Fuerza Bruta en Login por Clave Compuesta (Email + IP)
// ============================================================================
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Duración del bloqueo: 15 minutos
  max: isLoadTestEnv ? 20 : 5, // 5 intentos fallidos
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : 'unknown';
    return `${email}:${req.ip}`;
  },
  handler: (req, res) => {
    const attemptedEmail = req.body?.email || 'desconocido';
    console.warn(`[SECURITY_AUDIT] Bloqueo temporal (15m) por fuerza bruta | Email: ${attemptedEmail} | IP: ${req.ip}`);

    return res.status(429).json({
      success: false,
      error: 'Cuenta bloqueada temporalmente por seguridad tras 5 intentos fallidos. Reintente en 15 minutos o solicite asistencia al Administrador.',
    });
  },
});

app.use('/api/auth/login', jsonParserStandard, loginLimiter);

// ============================================================================
// RUTAS DE LA APLICACIÓN
// ============================================================================
app.use('/api/sales', jsonParserStandard, saleRoutes);
app.use('/api/auth', jsonParserStandard, authRoutes);
app.use('/api/users', jsonParserStandard, userRoutes);
app.use('/api/dashboard', jsonParserStandard, dashboardRoutes);
app.use('/api/reports', jsonParserStandard, reportRoutes);
app.use('/api/products', jsonParserStandard, productRoutes);
app.use('/api/movements', jsonParserLarge, movementRoutes);
app.use('/api/warehouses', jsonParserStandard, warehouseRoutes);
app.use('/api/stock', jsonParserLarge, stockRoutes);

// ============================================================================
// MANEJO DE ERRORES GLOBALES
// ============================================================================
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      success: false,
      error: 'El tamaño de la petición excede el límite permitido.',
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