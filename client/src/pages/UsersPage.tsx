import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
  ShieldCheck, ShoppingBag, Warehouse, Search, 
  Edit2, Users, X, AlertCircle, CheckCircle2, Plus 
} from 'lucide-react';
import { useAuth, API_URL } from '../context/AuthContext';
import { type User, type Role } from '../types/user';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export default function UsersPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setUsers(data.data);
      } else {
        throw new Error(data.error || 'Error al cargar usuarios');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error de conexión' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user: User) => {
    setActionLoadingId(user.id);
    try {
      const response = await fetch(`${API_URL}/api/users/${user.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setFeedback({
          type: 'success',
          message: `El usuario ${data.data.name} ${data.data.isActive ? 'ha sido activado' : 'ha sido desactivado'}.`,
        });
        fetchUsers();
      } else {
        throw new Error(data.error || 'No se pudo cambiar el estado');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };
  
  const renderRoleBadge = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return <Badge variant="info" className="bg-[#DBEAFE] text-[#1E40AF]" icon={<ShieldCheck size={14} />}>Administrador</Badge>;
      case 'VENDEDOR':
        return <Badge variant="purple" icon={<ShoppingBag size={14} />}>Vendedor</Badge>;
      case 'BODEGUERO':
        return <Badge variant="warning" className="bg-[#FFEDD5] text-[#9A3412]" icon={<Warehouse size={14} />}>Bodeguero</Badge>;
      default:
        return null;
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 mb-12 sm:px-0">
      
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-dark tracking-tight">Gestión de usuarios</h1>
          <p className="text-slate-mid text-sm mt-1">Administra los usuarios del sistema y sus roles de acceso</p>
        </div>
        <Button 
          variant="primary"
          leftIcon={<Plus className="w-5 h-5" />}
          onClick={() => navigate('/users/add')}
          className="w-full sm:w-auto"
        >
          Crear Usuario
        </Button>
      </header>

      {/* Feedback Alert */}
      {feedback && (
        <div className={`p-4 rounded-lg border flex items-center justify-between gap-3 text-sm ${feedback.type === 'success' ? 'bg-success-bg border-emerald-300 text-emerald-900' : 'bg-red-50 border-danger/30 text-danger'}`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-danger" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-mid hover:text-dark transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filtros utilizando el UI Kit */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center">
        <div className="w-full sm:w-96">
          <Input
            placeholder="Buscar por nombre o correo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startIcon={<Search size={16} />}
          />
        </div>
        
        <div className="md:w-fit w-full flex items-center gap-2">
           <label className="text-xs font-semibold text-slate-mid uppercase tracking-wider shrink-0 hidden sm:block">
            Filtrar por Rol:
          </label>
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'Todos los roles' },
              { value: 'ADMIN', label: 'Administrador' },
              { value: 'VENDEDOR', label: 'Vendedor' },
              { value: 'BODEGUERO', label: 'Bodeguero' }
            ]}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-surface rounded-lg border border-light-gray overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-mid text-sm">Cargando nómina de usuarios...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-mid text-sm">
            No se encontraron usuarios que coincidan con la búsqueda.
          </div>
        ) : (
          <>
            {/* Vista Desktop/Tablet (Tabla) */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse hidden md:table">
                <thead>
                  <tr className="bg-[#F8FAFC] text-[#64748B] text-xs font-semibold tracking-wider uppercase border-b border-light-gray">
                    <th className="py-4 px-6">Usuario</th>
                    <th className="py-4 px-6">Correo</th>
                    <th className="py-4 px-6">Rol</th>
                    <th className="py-4 px-6">Estado</th>
                    <th className="py-4 px-6">Fecha creación</th>
                    <th className="py-4 px-6">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-gray bg-white text-sm">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm shrink-0 text-white bg-linear-to-br from-primary to-purple-600">
                            {getInitials(user.name)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-dark">{user.name}</span>
                            {user.assignedWarehouse && <span className="text-xs text-slate-mid">Sede: {user.assignedWarehouse.name}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-dark-different">{user.email}</td>
                      <td className="py-4 px-6">{renderRoleBadge(user.role)}</td>
                      <td className="py-4 px-6">
                        {user.isActive ? (
                          <Badge variant="success">Activo</Badge>
                        ) : (
                          <Badge variant="danger">Inactivo</Badge>
                        )}
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-mid">
                        {user.createdAt ? formatDate(user.createdAt) : '-'}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Edit2 size={14} />}
                            className="border border-gray-200 text-primary hover:bg-primary/5"
                            onClick={() => navigate('/users/edit', { state: { user } })}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Users size={14} />}
                            isLoading={actionLoadingId === user.id}
                            className={`border border-gray-200 ${user.isActive ? 'text-danger hover:bg-red-50' : 'text-success hover:bg-emerald-50'}`}
                            onClick={() => handleToggleStatus(user)}
                          >
                            {user.isActive ? 'Desactivar' : 'Activar'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista Mobile (Tarjetas) */}
            <div className="flex flex-col divide-y divide-light-gray bg-white md:hidden">
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-4 flex flex-col gap-4 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start gap-2 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm shrink-0 text-white bg-linear-to-br from-blue-600 to-purple-600">
                        {getInitials(user.name)}
                      </div>
                      <div className="flex flex-col shrink">
                        <span className="font-semibold text-dark leading-tight">{user.name}</span>
                        <span className="text-sm text-slate-mid mt-0.5">{user.email}</span>
                      </div>
                    </div>
                    <div>
                    {user.isActive ? (
                      <Badge variant="success">Activo</Badge>
                    ) : (
                      <Badge variant="danger">Inactivo</Badge>
                    )}
                    </div>
                    
                  </div>
                  
                  <div className="flex items-center justify-between text-sm flex-wrap gap-4">
                    {renderRoleBadge(user.role)}
                    <span className="text-xs text-slate-mid">
                      Creado en:
                      {user.createdAt ? formatDate(user.createdAt) : '-'}
                    </span>
                  </div>
                  
                  {user.assignedWarehouse && (
                    <div className="text-xs text-slate-mid bg-slate-50 px-2 py-1.5 rounded self-start">
                      Sede: {user.assignedWarehouse.name}
                    </div>
                  )}

                  <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Edit2 size={14} />}
                      className="border border-gray-200 text-primary hover:bg-primary/5 w-full"
                      onClick={() => navigate('/users/edit', { state: { user } })}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Users size={14} />}
                      isLoading={actionLoadingId === user.id}
                      className={`border border-gray-200 w-full ${user.isActive ? 'text-danger hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                      onClick={() => handleToggleStatus(user)}
                    >
                      {user.isActive ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}