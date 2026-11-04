import { type ReactNode } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { type Role } from '../types/user';

interface ProtectedRouteProps {
  /** Componentes hijos opcionales para renderizado directo */
  children?: ReactNode;
  /** Roles explícitamente autorizados para la ruta (RBAC) */
  allowedRoles?: Role[];
  /** Ruta de redirección cuando el usuario no cuenta con el rol requerido */
  unauthorizedRedirectTo?: string;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  unauthorizedRedirectTo = '/dashboard',
}: ProtectedRouteProps) {
  const { user, accessToken, isLoading } = useAuth();
  const location = useLocation();

  // Prevención de UI Flash / Race Conditions:
  // Retiene el renderizado de la UI mientras la verificación inicial de checkAuth() valida el refresh token
  if (isLoading) {
    return (
      <div 
        className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0F1729] text-white p-4"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-light text-sm font-medium animate-pulse">
            Verificando credenciales de acceso seguro...
          </p>
        </div>
      </div>
    );
  }

  // Autenticación (401 Unauthorized):
  // Sin token en memoria ni datos de usuario -> Redirección limpia a /login presertando el intento de navegación
  if (!user || !accessToken) {
    return (
      <Navigate 
        to="/" 
        state={{ from: location.pathname + location.search }} 
        replace 
      />
    );
  }

  // Control de Acceso Basado en Roles - RBAC (403 Forbidden):
  // Si el usuario autenticado intenta acceder a un recurso sin los permisos necesarios
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role as Role)) {
    return <Navigate to={unauthorizedRedirectTo} replace />;
  }

  // Permite usar como Layout (<Outlet />) o como Wrapper (<ProtectedRoute>{children}</ProtectedRoute>)
  return children ? <>{children}</> : <Outlet />;
}