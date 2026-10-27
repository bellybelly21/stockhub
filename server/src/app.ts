import express from 'express';
import cors from 'cors';
import saleRoutes from './routes/sales.routes';
import authRoutes from './routes/auth.routes'; 

const app = express();

app.use(cors());
app.use(express.json());

// Registro de rutas
app.use('/api/sales', saleRoutes);
app.use('/api/auth', authRoutes);

// Middleware global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Error Global]:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

export default app;