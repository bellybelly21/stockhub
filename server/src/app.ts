import express from 'express';
import cors from 'cors';
import saleRoutes from './routes/sales.routes';
import authRoutes from './routes/auth.routes'; 
import userRoutes from './routes/user.routes';
import productRoutes from './routes/product.routes';
import movementRoutes from './routes/movement.routes';
import warehouseRoutes from './routes/warehouse.routes';
import stockRoutes from './routes/stock.routes';

const app = express();

app.use(cors());
app.use(express.json());

// Registro de rutas
app.use('/api/sales', saleRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/stocks', stockRoutes);

// Middleware global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Error Global]:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

export default app;