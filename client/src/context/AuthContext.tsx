import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { AuthService } from '../services/auth.service';
import type { AuthUser } from '../types/auth';

export { API_URL } from '../config/api';
export type { AuthUser as User } from '../types/auth';

interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (accessToken: string, userData: AuthUser) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  const isCheckingAuth = useRef(false);

  const login = (token: string, userData: AuthUser) => {
    setAccessToken(token);
    setUser(userData);

    let redirectPath = '/';
    if (userData.role === 'ADMIN') redirectPath = '/dashboard';
    else if (userData.role === 'BODEGUERO') redirectPath = '/inventory';
    else if (userData.role === 'VENDEDOR') redirectPath = '/sales';

    navigate(redirectPath, { replace: true });
  };

  const logout = async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('Error al notificar cierre de sesión al servidor:', error);
    } finally {
      setAccessToken(null);
      setUser(null);
      navigate('/', { replace: true });
    }
  };

  const checkAuth = async () => {
    if (isCheckingAuth.current) return;
    isCheckingAuth.current = true;

    try {
      const data = await AuthService.refresh();
      if (data.success && data.accessToken && data.user) {
        setAccessToken(data.accessToken);
        setUser(data.user);
      } else {
        setAccessToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('[AuthCheck Error]:', error);
      setAccessToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
      isCheckingAuth.current = false;
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

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