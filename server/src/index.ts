import 'dotenv/config';
import app from './app';
import { AuthService } from './services/auth.service';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

AuthService.initializeBlacklist().catch(console.error);
// Railway requiere explícitamente escuchar en '0.0.0.0' para mapear sus contenedores correctamente
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor del ERP inicializado en el puerto ${PORT}`);
});