import { type ReactNode } from 'react';
import { Navigate, useLocation, Outlet, Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { type Role } from '../types/user';

interface ProtectedRouteProps {

  children?: ReactNode;

  allowedRoles?: Role[];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, accessToken, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div 
        className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0F1729] text-white p-4"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium animate-pulse">
            Verificando credenciales de acceso seguro...
          </p>
        </div>
      </div>
    );
  }

  if (!user || !accessToken) {
    return (
      <Navigate 
        to="/" 
        state={{ from: location.pathname + location.search }} 
        replace 
      />
    );
  }

  // Si el usuario autenticado intenta acceder a un recurso sin los permisos necesarios
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role as Role)) {
    // Calculamos su ruta principal dependiendo del rol
    let homePath = '/';
    if (user.role === 'ADMIN') homePath = '/dashboard';
    if (user.role === 'BODEGUERO') homePath = '/inventory';
    if (user.role === 'VENDEDOR') homePath = '/sales';

    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0F1729] text-white p-4">
        <div className="bg-dark border border-slate-700/50 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center flex flex-col items-center">
          
          <div className="text-red-400 mb-6 bg-red-400/10 p-4 rounded-full">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-slate-100 mb-2">
            Ups, no tienes acceso
          </h1>
          
          <p className="text-slate-400 mb-8 leading-relaxed">
            Tu rol actual de <span className="font-semibold text-blue-400">{user.role}</span> no tiene los permisos necesarios para ver esta página.
          </p>
          
          <Link 
            to={homePath}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex justify-center items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a mi inicio
          </Link>

        </div>
      </div>
    );
  }

  // Permite usar como Layout (<Outlet />) o como Wrapper (<ProtectedRoute>{children}</ProtectedRoute>)
  return children ? <>{children}</> : <Outlet />;
}