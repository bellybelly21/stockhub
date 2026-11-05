import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { X, Eye, EyeOff, AlertCircle, CheckCircle2, UserPlus, Info } from 'lucide-react';
import { useAuth, API_URL } from '../context/AuthContext';
import { type Role, type CreateUserData, type User } from '../types/user';
import { validateRun, formatRun } from '../utils/run';

export default function AddUser() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const editingUser = location.state?.user as User | undefined;
  const isEdit = !!editingUser;

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const [warehouses, setWarehouses] = useState<any[]>([]);

  const initialRun = editingUser?.run || (editingUser as any)?.rut || '';

  const [formData, setFormData] = useState<CreateUserData>({
    run: initialRun ? formatRun(initialRun) : '',
    name: editingUser?.name || '',
    email: editingUser?.email || '',
    password: '',
    confirmPassword: '',
    role: editingUser?.role || 'VENDEDOR',
    assignedWarehouseId: editingUser?.assignedWarehouseId || '',
  });

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const response = await fetch(`${API_URL}/api/warehouses`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const data = await response.json();
        if (data.success) {
          setWarehouses(data.data);
        }
      } catch (error) {
        console.error('Error cargando bodegas', error);
      }
    };
    fetchWarehouses();
  }, [accessToken]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Solo validamos el RUT si estamos creando un usuario nuevo
    if (!isEdit && (!formData.run || !validateRun(formData.run))) {
      errors.run = 'El RUN ingresado no es válido';
    }
    
    if (!formData.name.trim() || formData.name.length < 2) errors.name = 'El nombre debe tener al menos 2 caracteres';
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Debe ingresar un correo electrónico válido';
    
    if (!isEdit && (!formData.password || formData.password.length < 8)) errors.password = 'La contraseña debe tener al menos 8 caracteres';
    if (!isEdit && formData.password !== formData.confirmPassword) errors.confirmPassword = 'Las contraseñas no coinciden';

    if ((formData.role === 'VENDEDOR' || formData.role === 'BODEGUERO') && !formData.assignedWarehouseId) {
      errors.warehouse = 'Debe asignar una bodega para este rol';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setFeedback(null);
    
    const url = isEdit ? `${API_URL}/api/users/${editingUser.id}` : `${API_URL}/api/users`;
    const method = isEdit ? 'PATCH' : 'POST'; 

    const bodyPayload: any = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      role: formData.role,
    };
    
    // Solo enviamos el RUT si estamos creando
    if (!isEdit) {
      bodyPayload.rut = formData.run.replace(/\./g, '').toUpperCase();
    }
    
    if (formData.assignedWarehouseId) bodyPayload.assignedWarehouseId = formData.assignedWarehouseId;
    if (formData.password) bodyPayload.password = formData.password;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setFeedback({ type: 'success', message: data.message || `Usuario ${isEdit ? 'actualizado' : 'creado'} exitosamente.` });
        setTimeout(() => navigate('/users'), 1500);
      } else {
        throw new Error(data.error || 'Error en la operación');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRun(e.target.value);
    setFormData({ ...formData, run: formatted });
    if (formErrors.run) setFormErrors({ ...formErrors, run: '' });
  };

  return (
    <section className="items-center justify-center flex">
      <div className="max-w-150 w-full">
        
        {/* Encabezado */}
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-[#111827]">
            {isEdit ? 'Editar trabajador' : 'Crear trabajador'}
          </h1>
          <p className="text-slate-500 mt-1 text-[15px]">
            {isEdit ? 'Actualice los datos del usuario en el sistema' : 'Cree nuevos usuarios para el sistema'}
          </p>
        </div>

        {feedback && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 text-sm ${feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mb-12">
          {/* Tarjeta del Formulario */}
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 flex flex-col gap-5">
            
            {/* Nombre Completo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-gray-700">
                Nombre completo <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                required 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                placeholder="Ej: Ana Torres" 
                className="px-4 py-2.5 rounded-lg border border-gray-300 text-[15px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-gray-400" 
              />
              {formErrors.name && <span className="text-xs text-red-500">{formErrors.name}</span>}
            </div>

            {/* RUN */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-gray-700">
                RUN <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                required 
                disabled={isEdit} 
                value={formData.run} 
                onChange={handleRunChange} 
                placeholder="10.123.456-7" 
                className="px-4 py-2.5 rounded-lg border border-gray-300 text-[15px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500 placeholder:text-gray-400" 
              />
              {formErrors.run && <span className="text-xs text-red-500">{formErrors.run}</span>}
            </div>

            {/* Correo Electrónico */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-gray-700">
                Correo electrónico <span className="text-red-500">*</span>
              </label>
              <input 
                type="email" 
                required 
                disabled={isEdit} 
                value={formData.email} 
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                placeholder="ana@empresa.cl" 
                className="px-4 py-2.5 rounded-lg border border-gray-300 text-[15px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500 placeholder:text-gray-400" 
              />
              {formErrors.email && <span className="text-xs text-red-500">{formErrors.email}</span>}
            </div>

            {/* Contraseña */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-gray-700">
                {isEdit ? 'Nueva contraseña' : 'Contraseña inicial'} <span className="text-red-500">{!isEdit && '*'}</span>
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required={!isEdit} 
                  value={formData.password} 
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-4 py-2.5 pr-10 rounded-lg border border-gray-300 text-[15px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-gray-400" 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formErrors.password && <span className="text-xs text-red-500">{formErrors.password}</span>}
            </div>

            {/* Confirmar Contraseña */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-gray-700">
                Confirmar contraseña <span className="text-red-500">{(!isEdit || formData.password) && '*'}</span>
              </label>
              <input 
                type={showPassword ? 'text' : 'password'} 
                required={!isEdit || !!formData.password} 
                value={formData.confirmPassword} 
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} 
                placeholder="Repita la contraseña"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-[15px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-gray-400" 
              />
              {formErrors.confirmPassword && <span className="text-xs text-red-500">{formErrors.confirmPassword}</span>}
            </div>

            {/* Rol Asignado */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-gray-700">
                Rol <span className="text-red-500">*</span>
              </label>
              <select 
                value={formData.role} 
                onChange={(e) => setFormData({ ...formData, role: e.target.value as Role, assignedWarehouseId: '' })} 
                className="px-4 py-2.5 rounded-lg border border-gray-300 text-[15px] text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white appearance-none transition-colors"
                style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
              >
                <option value="VENDEDOR">Vendedor</option>
                <option value="BODEGUERO">Bodeguero</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>

            {/* Cuadro de Información */}
            <div className="bg-[#EFF6FF] text-[#2563EB] p-4 rounded-lg flex gap-3 items-start mt-1 border border-blue-100 flex-wrap sm:flex-nowrap">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-[14px] leading-snug font-medium">
                Los permisos del usuario se asignarán automáticamente según el rol seleccionado.
              </p>
            </div>

            {/* Bodega Asignada */}
            {(formData.role === 'VENDEDOR' || formData.role === 'BODEGUERO') && (
              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-[14px] font-semibold text-gray-700">
                  Bodega Asignada <span className="text-red-500">*</span>
                </label>
                <select 
                  value={formData.assignedWarehouseId || ''} 
                  onChange={(e) => setFormData({ ...formData, assignedWarehouseId: e.target.value })} 
                  className="px-4 py-2.5 rounded-lg border border-gray-300 text-[15px] text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white appearance-none transition-colors"
                  style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                >
                  <option value="">-- Seleccione una Bodega --</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
                {formErrors.warehouse && <span className="text-xs text-red-500">{formErrors.warehouse}</span>}
              </div>
            )}
            
          </div>

          {/* Botones de Acción */}
          <div className="flex justify-end gap-3 mt-6">
            <button 
              type="button" 
              onClick={() => navigate('/users')} 
              className="px-5 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-[14px] font-medium text-gray-700 flex items-center gap-2 transition-colors shadow-sm"
            >
              <X className="w-4 h-4" /> Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isLoading} 
              className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-medium rounded-lg text-[14px] flex items-center gap-2 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-4 h-4" />
              {isLoading ? 'Guardando...' : (isEdit ? 'Actualizar usuario' : 'Crear usuario')}
            </button>
          </div>
        </form>

      </div>
    </section>
  );
}