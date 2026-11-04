import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
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

  const login = (token: string, userData: User) => {
    setAccessToken(token);
    setUser(userData);
    
    let redirectPath = '/';
    if (userData.role === 'ADMIN') {
      redirectPath = '/dashboard';
    } else if (userData.role === 'BODEGUERO') {
      redirectPath = '/inventario';
    } else if (userData.role === 'VENDEDOR') {
      redirectPath = '/ventas';
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
      setAccessToken(null);
      setUser(null);
      navigate('/', { replace: true });
    }
  };

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Sesión expirada o no válida');
      }

      const data = await response.json();
      if (data.success && data.accessToken && data.user) {
        setAccessToken(data.accessToken);
        setUser(data.user);
      } else {
        setAccessToken(null);
        setUser(null);
      }
    } catch {
      setAccessToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Verificación inicial de la sesión al montar la app
  useEffect(() => {
    checkAuth();
  }, []);

  // Silent Refresh: Temporizador de 14 minutos que solo corre mientras haya sesión activa
  useEffect(() => {
    if (!accessToken) return;

    const FOURTEEN_MINUTES = 14 * 60 * 1000;
    const interval = setInterval(() => {
      checkAuth();
    }, FOURTEEN_MINUTES);

    return () => clearInterval(interval);
  }, [accessToken]);

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