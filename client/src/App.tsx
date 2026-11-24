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
import SalesPage from './pages/SalePage';
import AddWarehouse from './pages/AddWarehouse';
import WarehousesPage from './pages/WarehousesPage';
import CriticalStockPage from './pages/CriticalStockPage';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';

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

            <Route path="/sales" element={
              <ProtectedRoute allowedRoles={['VENDEDOR', 'ADMIN']}>
                <SalesPage />
              </ProtectedRoute>
            } />

            <Route path="/warehouses" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <WarehousesPage />
              </ProtectedRoute>
            } />

            <Route path="/warehouses/add" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AddWarehouse />
              </ProtectedRoute>
            } />

            <Route
              path="/critical-stock"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <CriticalStockPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;