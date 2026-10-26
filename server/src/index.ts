import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { prisma } from './db/client'; 

const connectionString = process.env.DATABASE_URL;
const app = express();
app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/api/test', async (req, res) => {
  try {
    // Intenta de consulta a los usuarios 
    const users = await prisma.user.findMany();
    res.json({ 
      message: '¡El servidor Express y Prisma están funcionando!', 
      db_status: 'Conectado a PostgreSQL',
      users 
    });
  } catch (error) {
    res.status(500).json({ error: 'Fallo la conexión a la base de datos', details: error });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor del ERP inicializado en el puerto ${PORT}`);
});