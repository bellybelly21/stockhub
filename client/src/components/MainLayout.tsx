import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from './LoadingScreen'; 
import { 
  LayoutDashboard, Package, PackageOpen, Box, Truck, ShoppingCart, 
  Warehouse, ArrowRightLeft, AlertTriangle, BarChart2, 
  Users, LogOut, Menu, X, 
} from 'lucide-react';

// Tipos para las opciones del menú
interface MenuItem {
  title: string;
  path: string;
  icon: React.ElementType;
}

export default function MainLayout() {
  const { user, logout, isLoading } = useAuth(); 
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Manejo de responsive y altura para forzar colapso
  useEffect(() => {
    const handleResize = () => {
      // Forzar colapso si la pantalla es estrecha (tablet) o tiene poca altura
      if (window.innerWidth < 1024 || window.innerHeight < 750) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
      
      // Cerrar el drawer móvil si pasamos a desktop
      if (window.innerWidth >= 768) {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Chequeo inicial
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Definición de todas las rutas posibles
  const ALL_MENU_ITEMS: Record<string, MenuItem> = {
    DASHBOARD: { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    INVENTARIO: { title: 'Inventario', path: '/inventory', icon: Package },
    PRODUCTOS: { title: 'Productos', path: '/products', icon: PackageOpen },
    ENTRADAS: { title: 'Entrada de mercancía', path: '/inbound', icon: Truck },
    VENTAS: { title: 'Ventas', path: '/sales', icon: ShoppingCart },
    BODEGAS: { title: 'Bodegas', path: '/warehouses', icon: Warehouse },
    TRANSFERENCIAS: { title: 'Transferencias', path: '/transfers', icon: ArrowRightLeft },
    STOCK_CRITICO: { title: 'Stock crítico', path: '/critical-stock', icon: AlertTriangle },
    REPORTES: { title: 'Reportes', path: '/reports', icon: BarChart2 },
    USUARIOS: { title: 'Usuarios', path: '/users', icon: Users },
  };

  // Filtrar menú según Rol
  const getMenuItems = () => {
    if (!user) return [];
    
    switch (user.role) {
      case 'ADMIN':
        return [
          ALL_MENU_ITEMS.DASHBOARD, ALL_MENU_ITEMS.INVENTARIO, ALL_MENU_ITEMS.PRODUCTOS,
          ALL_MENU_ITEMS.ENTRADAS, ALL_MENU_ITEMS.VENTAS, ALL_MENU_ITEMS.BODEGAS,
          ALL_MENU_ITEMS.TRANSFERENCIAS, ALL_MENU_ITEMS.STOCK_CRITICO, ALL_MENU_ITEMS.REPORTES,
          ALL_MENU_ITEMS.USUARIOS
        ];
      case 'BODEGUERO':
        return [
          ALL_MENU_ITEMS.INVENTARIO, ALL_MENU_ITEMS.PRODUCTOS,
          ALL_MENU_ITEMS.TRANSFERENCIAS, ALL_MENU_ITEMS.ENTRADAS,
          ALL_MENU_ITEMS.BODEGAS
        ];
      case 'VENDEDOR':
        return [ALL_MENU_ITEMS.VENTAS];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex h-screen w-full bg-surface overflow-hidden font-sans">
      
      {/* OVERLAY PARA MOBILE */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside 
        className={`
          fixed md:relative z-50 h-full bg-[#0F1729] text-light-gray flex flex-col transition-all duration-100 ease-in-out
          ${isCollapsed ? 'md:w-20' : 'md:w-64'}
          ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* LOGO AREA */}
        <div className="h-16 flex items-center px-4 mb-4 mt-2">
          <div className="bg-primary p-2 rounded-lg text-white shrink-0">
            <Box size={24} />
          </div>
          <div className={`ml-3 whitespace-nowrap transition-opacity duration-300 ${isCollapsed && !isMobileOpen ? 'opacity-0 hidden' : 'opacity-100'}`}>
            <p className="text-sm font-bold text-white leading-tight">Gestión de</p>
            <p className="text-sm font-bold text-primary leading-tight">Inventario</p>
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-dark-different py-2">
          <ul className="space-y-1 px-3">
            {menuItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <li key={item.path}>
                  <Link 
                    to={item.path}
                    title={isCollapsed && !isMobileOpen ? item.title : undefined}
                    className={`
                      flex items-center rounded-lg px-3 py-2.5 transition-colors
                      ${isActive ? 'bg-primary/10 text-blue-400' : 'hover:bg-dark hover:text-white'}
                      ${isCollapsed && !isMobileOpen ? 'justify-center' : 'justify-start'}
                    `}
                    onClick={() => window.innerWidth < 768 && setIsMobileOpen(false)}
                  >
                    <item.icon size={20} className="flex-shrink-0" />
                    <span className={`ml-3 text-sm font-medium whitespace-nowrap transition-opacity duration-300 ${isCollapsed && !isMobileOpen ? 'opacity-0 hidden' : 'opacity-100'}`}>
                      {item.title}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* USER PROFILE & LOGOUT SECTION */}
        <div className="border-t border-dark p-4 shrink-0 border-2">
          <div className={`flex flex-col mb-4 whitespace-nowrap transition-opacity duration-300 ${isCollapsed && !isMobileOpen ? 'opacity-0 hidden' : 'opacity-100'}`}>
            <span className="text-xs text-light-gray font-medium mb-2">Sesión activa</span>
            <span className="text-sm font-bold text-white truncate mb-2">{user?.name}</span>
            <span className="text-xs text-blue-400">{user?.role === 'ADMIN' 
    ? 'Administrador' 
    : user?.role === 'BODEGUERO' 
    ? 'Bodeguero' 
    : user?.role === 'VENDEDOR' 
    ? 'Vendedor' 
    : user?.role}</span>
          </div>
          
          <button 
            onClick={logout}
            title={isCollapsed && !isMobileOpen ? "Cerrar sesión" : undefined}
            className={`
              w-full flex items-center text-light-gray hover:text-white hover:bg-dark rounded-lg px-3 py-2 transition-colors
              ${isCollapsed && !isMobileOpen ? 'justify-center' : 'justify-start'}
            `}
          >
            <LogOut size={20} className="flex-shrink-0" />
            <span className={`ml-3 text-sm font-medium whitespace-nowrap ${isCollapsed && !isMobileOpen ? 'hidden' : 'block'}`}>
              Cerrar sesión
            </span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* TOP NAVBAR */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
          
          {/* Toggles y Breadcrumb */}
          <div className="flex items-center gap-4">
            {/* Toggle Mobile */}
            <button 
              className="md:hidden p-2 text-slate-mid hover:bg-slate-100 rounded-lg"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            
            {/* Toggle Desktop/Tablet */}
            <button 
              className="hidden md:flex p-2 text-slate-mid hover:bg-slate-100 rounded-lg"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? <Menu size={20} /> : <X size={20} />}
            </button>

            {/* Breadcrumb  */}
            <div className="hidden sm:flex items-center text-sm">
              <span className="text-slate-light">Sistema</span>
              <span className="mx-2 text-light-gray">/</span>
              <span className="font-medium text-dark-different capitalize">
                {location.pathname.split('/')[1] || 'Inicio'}
              </span>
            </div>
          </div>

          {/* Notificaciones y Perfil rápido */}
          <div className="flex items-center gap-4">

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end text-sm">
                <span className="font-bold text-dark leading-tight">{user?.name}</span>
                <span className="text-xs text-primary font-medium leading-tight">
                {user?.role === 'ADMIN' 
    ? 'Administrador' 
    : user?.role === 'BODEGUERO' 
    ? 'Bodeguero' 
    : user?.role === 'VENDEDOR' 
    ? 'Vendedor' 
    : user?.role}
                </span>
              </div>
              <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold text-lg">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-auto min-h-screen bg-canvas px-4 py-6 lg:p-12 font-sans">
          <Outlet /> {/* Aquí se inyectan las páginas hijas */}
        </main>
      </div>
    </div>
  );
}