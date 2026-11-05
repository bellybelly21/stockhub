import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import Login from './Login'
import ProtectedRoute from './components/ProtectedRoute';
import UsersPage from './pages/UsersPage';
import AddUser from './pages/AddUser';
import InventoryPage from './pages/InventoryPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Login />} />

          {/* Rutas exclusivas para ADMIN */}
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['ADMIN']}><div className="p-8">Dashboard Admin (Estadísticas)</div></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute allowedRoles={['ADMIN']}><UsersPage /></ProtectedRoute>} />
          <Route path="/users/add" element={<ProtectedRoute allowedRoles={['ADMIN']}><AddUser /></ProtectedRoute>} />
          <Route path="/users/edit" element={<ProtectedRoute allowedRoles={['ADMIN']}><AddUser /></ProtectedRoute>} />

          {/* Rutas exclusivas para BODEGUERO */}
          <Route path="/inventory" element={<ProtectedRoute allowedRoles={['BODEGUERO', 'ADMIN']}><InventoryPage /> </ProtectedRoute>} />

          {/* Rutas exclusivas para VENDEDOR */}
          <Route path="/sales" element={<ProtectedRoute allowedRoles={['VENDEDOR', 'ADMIN']}><div className="p-8">Vista de Ventas (Vendedor)</div></ProtectedRoute>} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;