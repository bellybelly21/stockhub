import 'dotenv/config';
import app from './app';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

app.use(helmet());

// Aquí hay que poner los origins del front y la url que nos dé railway cuando despleguemos
app.use(cors({
  origin: ['http://localhost:5173', 'https://mi-erp.cl'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // Límite de 200 peticiones por IP
  message: { success: false, error: 'Demasiadas peticiones. Intente más tarde.' }
});
app.use('/api', limiter);

// Limitador para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Solo 5 intentos fallidos
  message: { success: false, error: 'Demasiados intentos de login. Cuenta bloqueada temporalmente.' }
});
app.use('/api/auth/login', loginLimiter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor del ERP inicializado en el puerto ${PORT}`);
});