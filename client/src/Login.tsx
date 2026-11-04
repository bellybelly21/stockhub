import { useState, type FormEvent } from 'react';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth, API_URL } from './context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Se utiliza la variable dinámica API_URL 
      const baseUrl = API_URL.replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Credenciales inválidas o error en el servidor');
      }

      login(data.accessToken, data.user);
      
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        setError('No hay conexión con el servidor. Verifica que el sistema esté en línea.');
      } else {
        setError(err.message || 'Ocurrió un error inesperado al intentar acceder.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main 
      className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-10 lg:px-8 lg:py-16"
      style={{ background: 'linear-gradient(135deg, #0F1729 0%, #172242 50%, #0F1729 100%)' }}
    >
      {/* Encabezado */}
      <header className="flex flex-col gap-3 items-center mb-10 text-center">
        <img 
          src="/Logo.svg" 
          alt="Logotipo de Stockhub ERP" 
          width="100" 
          height="100" 
          className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 shadow-[0_8px_32px_0_rgba(37,99,235,0.40)] rounded-3xl object-contain transition-all" 
        />
        <h1 className="text-white font-bold text-[clamp(1.75rem,4vw,2.5rem)] leading-tight">
          Stockhub ERP
        </h1>
        <p className="text-dark-bright font-normal text-[clamp(0.875rem,2vw,1.125rem)]">
          Acceso interno de trabajadores
        </p>
      </header>

      {/* Tarjeta de Formulario */}
      <section className="bg-white p-4 md:p-8 rounded-xl shadow-2xl w-full max-w-md">
        
        {error && (
          <div className="mb-6 p-4 bg-danger/10 border-l-4 border-danger rounded-md flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <p className="text-sm text-danger font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs sm:text-sm font-medium text-dark">
              Correo electrónico
            </label>
            <input 
              id="email"
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@empresa.cl"
              className="w-full px-4 py-2.5 rounded-lg bg-white border border-light-gray text-dark-different placeholder:text-slate-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
              disabled={isLoading}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs sm:text-sm font-medium text-dark">
              Contraseña
            </label>
            <div className="relative">
              <input 
                id="password"
                type={showPassword ? "text" : "password"} 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-4 pr-11 py-2.5 rounded-lg bg-white border border-light-gray text-dark-different placeholder:text-slate-light focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-mid hover:text-dark focus:outline-none cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Botón Principal */}
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 bg-primary hover:bg-primary-hover disabled:bg-slate-light text-white font-semibold rounded-xl transition-colors md:text-base text-sm cursor-pointer flex justify-center items-center gap-2"
          >
            {isLoading ? 'Verificando...' : 'Iniciar sesión'}
          </button>
        </form>
      </section>

      {/* Footer de Seguridad */}
      <div className="flex items-center justify-center gap-2 mt-6 w-full max-w-sm px-4 text-dark-bright text-xs sm:text-sm text-center">
        <Shield className="w-4 h-4 shrink-0" /> 
        <span>Acceso exclusivo para personal autorizado</span>
      </div>
    </main>
  );
}