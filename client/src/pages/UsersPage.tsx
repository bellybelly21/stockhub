import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
  ShieldCheck, ShoppingBag, Warehouse, Search, 
  Edit2, Users, X, AlertCircle, CheckCircle2, Plus 
} from 'lucide-react';
import { useAuth, API_URL } from '../context/AuthContext';
import { type User, type Role } from '../types/user';

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
    const badges = {
      ADMIN: <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold bg-[#DBEAFE] text-[#1E40AF]"><ShieldCheck className="w-3.5 h-3.5" /> Administrador</span>,
      VENDEDOR: <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold bg-[#F3E8FF] text-[#6B21A8]"><ShoppingBag className="w-3.5 h-3.5" /> Vendedor</span>,
      BODEGUERO: <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold bg-[#FFEDD5] text-[#9A3412]"><Warehouse className="w-3.5 h-3.5" /> Bodeguero</span>
    };
    return badges[role] || null;
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-canvas px-4 py-6 lg:p-8 font-sans text-dark">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6!">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-dark tracking-tight">Gestión de trabajadores</h1>
            <p className="text-slate-mid text-sm mt-1">Administra los usuarios del sistema y sus roles de acceso</p>
          </div>
          <button
            onClick={() => navigate('/users/add')}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors cursor-pointer text-sm shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Crear Usuario</span>
          </button>
        </header>

        {feedback && (
          <div className={`p-4 rounded-lg border flex items-center justify-between gap-3 text-sm ${feedback.type === 'success' ? 'bg-success-bg border-emerald-300 text-emerald-900' : 'bg-red-50 border-danger/30 text-danger'}`}>
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-danger" />}
              <span className="font-medium">{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-mid hover:text-dark"><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-mid" />
            <input
              type="text" placeholder="Buscar por nombre o correo..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-light-gray rounded-lg text-dark-different text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-semibold text-slate-mid uppercase tracking-wider shrink-0">Filtrar por Rol:</label>
            <select
              value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full sm:w-48 px-3 py-2.5 bg-white border border-light-gray rounded-lg text-sm focus:outline-none focus:border-primary"
            >
              <option value="ALL">Todos los roles</option>
              <option value="ADMIN">Administrador</option>
              <option value="VENDEDOR">Vendedor</option>
              <option value="BODEGUERO">Bodeguero</option>
            </select>
          </div>
        </div>

        <div className="bg-surface rounded-lg border border-light-gray overflow-hidden">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-mid text-sm">Cargando nómina de usuarios...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
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
                <tbody className="divide-y bg-white divide-light-gray/40 text-sm">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-canvas/60 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm shrink-0 text-white bg-gradient-to-br from-blue-600 to-purple-600">
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
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-success-bg text-emerald-800">Activo</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-danger">Inactivo</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-mid">
                        {user.createdAt ? formatDate(user.createdAt) : '-'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-start justify-start gap-2">
                          <button
                            onClick={() => navigate('/users/edit', { state: { user } })}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] border border-[#E2E8F0] text-primary hover:bg-primary/5 transition-colors text-xs font-medium"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Editar
                          </button>
                          <button
                            onClick={() => handleToggleStatus(user)}
                            disabled={actionLoadingId === user.id}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] border border-[#E2E8F0] transition-colors text-xs font-medium ${
                              user.isActive ? 'text-danger hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            <Users className="w-3.5 h-3.5" /> {user.isActive ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}