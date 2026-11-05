import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  rut?: string;
  assignedWarehouseId?: string | null;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (accessToken: string, userData: User) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const API_URL = RAW_API_URL.endsWith('/api') ? RAW_API_URL.replace(/\/api$/, '') : RAW_API_URL;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  
  // Ref de bloqueo para evitar que el StrictMode de React o doble render envíen 2 peticiones a la vez
  const isCheckingAuth = useRef(false);

  const login = (token: string, userData: User) => {
    setAccessToken(token);
    setUser(userData);
    
    // Redirección inteligente basada en RBAC
    let redirectPath = '/';
    if (userData.role === 'ADMIN') {
      redirectPath = '/dashboard';
    } else if (userData.role === 'BODEGUERO') {
      redirectPath = '/inventory';
    } else if (userData.role === 'VENDEDOR') {
      redirectPath = '/sales';
    }

    navigate(redirectPath, { replace: true });
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Error al notificar cierre de sesión al servidor:', error);
    } finally {
      // Limpiamos el estado sin importar si el servidor respondió bien o mal
      setAccessToken(null);
      setUser(null);
      navigate('/', { replace: true });
    }
  };

  const checkAuth = async () => {
    // Si ya hay una petición en curso, no hacemos nada (evita la colisión)
    if (isCheckingAuth.current) return;
    isCheckingAuth.current = true;

    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      // El .catch evita que crashee si el servidor devuelve un error HTML en lugar de JSON
      const data = await response.json().catch(() => ({})); 

      if (response.ok && data.success && data.accessToken && data.user) {
        setAccessToken(data.accessToken);
        setUser(data.user);
      } else {
        // Si no es OK, limpiamos la sesión
        setAccessToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('[AuthCheck Error]:', error);
      setAccessToken(null);
      setUser(null);
    } finally {
      // Liberamos el estado de carga y el candado de concurrencia
      setIsLoading(false);
      isCheckingAuth.current = false;
    }
  };

  // Verificación inicial de la sesión al montar la app
  useEffect(() => {
    checkAuth();
  }, []); // Solo se ejecuta una vez al montar

  // Temporizador de 14 minutos que solo corre mientras haya sesión activa
  useEffect(() => {
    if (!accessToken) return;

    const FOURTEEN_MINUTES = 14 * 60 * 1000;
    const interval = setInterval(() => {
      checkAuth();
    }, FOURTEEN_MINUTES);

    return () => clearInterval(interval);
  }, [accessToken]); // Se recrea el intervalo si el accessToken cambia

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider');
  }
  return context;
};