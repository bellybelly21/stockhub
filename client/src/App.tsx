import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import Login from './Login';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import UsersPage from './pages/UsersPage';
import AddUser from './pages/AddUser';
import InventoryPage from './pages/InventoryPage';
import AddProduct from './pages/AddProduct';
import ProductsPage from './pages/ProductsPage';
import MovementsPage from './pages/MovementsPage';
import TransferPage from './pages/TransferPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Ruta pública sin layout de Sidebar */}
          <Route path="/" element={<Login />} />

          {/* RUTAS PROTEGIDAS ENVUELTAS EN MAINLAYOUT */}
          <Route element={<MainLayout />}>
            
            {/* --- ADMIN --- */}
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <div className="p-8">Dashboard Admin (Estadísticas)</div>
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <UsersPage />
              </ProtectedRoute>
            } />
            <Route path="/users/add" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AddUser />
              </ProtectedRoute>
            } />
            <Route path="/users/edit" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AddUser />
              </ProtectedRoute>
            } />

            <Route path="/inventory" element={
              <ProtectedRoute allowedRoles={['BODEGUERO', 'ADMIN']}>
                <InventoryPage />
              </ProtectedRoute>
            } />

            <Route path="/products/add" element={
              <ProtectedRoute allowedRoles={['BODEGUERO', 'ADMIN']}>
                <AddProduct />
              </ProtectedRoute>
            } />

            <Route path="/products" element={
              <ProtectedRoute allowedRoles={['BODEGUERO', 'ADMIN']}>
                <ProductsPage />
              </ProtectedRoute>
            } />

            <Route path="/products/view/:id" element={
              <ProtectedRoute allowedRoles={['BODEGUERO', 'ADMIN']}>
                <AddProduct />
              </ProtectedRoute>
            } />

            <Route path="/products/edit/:id" element={
              <ProtectedRoute allowedRoles={['BODEGUERO', 'ADMIN']}>
                <AddProduct />
              </ProtectedRoute>
            } />

            <Route path="/movements" element={
              <ProtectedRoute allowedRoles={['BODEGUERO', 'ADMIN']}>
                <MovementsPage />
              </ProtectedRoute>
            } />

            <Route path="/transfers" element={
              <ProtectedRoute allowedRoles={['BODEGUERO', 'ADMIN']}>
                <TransferPage />
              </ProtectedRoute>
            } />
            
            {/* Ejemplos de rutas pendientes */}
            <Route path="/warehouses" element={<ProtectedRoute allowedRoles={['BODEGUERO', 'ADMIN']}><div className="p-4 bg-white rounded-lg  border border-slate-200">Bodegas</div></ProtectedRoute>} />
            
            <Route path="/critical-stock" element={<ProtectedRoute allowedRoles={['ADMIN']}><div className="p-4 bg-white rounded-lg  border border-slate-200">Stock Crítico</div></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute allowedRoles={['ADMIN']}><div className="p-4 bg-white rounded-lg  border border-slate-200">Reportes</div></ProtectedRoute>} />

            <Route path="/sales" element={
              <ProtectedRoute allowedRoles={['VENDEDOR', 'ADMIN']}>
                <div className="p-8 bg-white rounded-lg  border border-slate-200">Vista de Ventas (Vendedor)</div>
              </ProtectedRoute>
            } />
            
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;