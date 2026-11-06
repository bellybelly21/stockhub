import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { X, AlertCircle, CheckCircle2, UserPlus, Info } from 'lucide-react';
import { useAuth, API_URL } from '../context/AuthContext';
import { type Role, type CreateUserData, type User } from '../types/user';
import { validateRun, formatRun } from '../utils/run';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';

export default function AddUser() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const editingUser = location.state?.user as User | undefined;
  const isEdit = !!editingUser;

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
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

  const warehouseOptions = [
    { value: '', label: 'Seleccione una Bodega' },
    ...warehouses.map(wh => ({ value: wh.id, label: wh.name }))
  ];

  return (
    <section className="items-center justify-center flex">
      <div className="max-w-xl w-full">
        
        {/* Encabezado */}
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-gray-900">
            {isEdit ? 'Editar usuario' : 'Crear usuario'}
          </h1>
          <p className="text-gray-500 mt-1 text-[15px]">
            {isEdit ? 'Actualice los datos del usuario en el sistema' : 'Crea nuevos usuarios para el sistema'}
          </p>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 text-sm ${feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mb-12">
          {/* Tarjeta del Formulario */}
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-5">
            
            <Input
              label="Nombre completo"
              required
              placeholder="Ej: Ana Torres"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={formErrors.name}
            />

            <Input
              label="RUN"
              required
              disabled={isEdit}
              placeholder="10.123.456-7"
              value={formData.run}
              onChange={handleRunChange}
              error={formErrors.run}
            />

            <Input
              label="Correo electrónico"
              type="email"
              required
              disabled={isEdit}
              placeholder="ana@empresa.cl"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={formErrors.email}
            />

            <Input
              label={isEdit ? 'Nueva contraseña' : 'Contraseña inicial'}
              type="password"
              required={!isEdit}
              placeholder="Mínimo 8 caracteres"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={formErrors.password}
            />

            <Input
              label="Confirmar contraseña"
              type="password"
              required={!isEdit || !!formData.password}
              placeholder="Repita la contraseña"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              error={formErrors.confirmPassword}
            />

            <Select
              label="Rol"
              required
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as Role, assignedWarehouseId: '' })}
              options={[
                { value: 'VENDEDOR', label: 'Vendedor' },
                { value: 'BODEGUERO', label: 'Bodeguero' },
                { value: 'ADMIN', label: 'Administrador' }
              ]}
            />

            {/* Cuadro de Información */}
            <div className="bg-blue-50 text-blue-700 p-4 rounded-lg flex gap-3 items-start mt-1 border border-blue-100">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-[14px] leading-snug font-medium">
                Los permisos del usuario se asignarán automáticamente según el rol seleccionado.
              </p>
            </div>

            {/* Bodega Asignada Condicional */}
            {(formData.role === 'VENDEDOR' || formData.role === 'BODEGUERO') && (
              <Select
                label="Bodega Asignada"
                required
                value={formData.assignedWarehouseId || ''}
                onChange={(e) => setFormData({ ...formData, assignedWarehouseId: e.target.value })}
                options={warehouseOptions}
                error={formErrors.warehouse}
              />
            )}
            
          </div>

          {/* Botones de Acción */}
          <div className="flex justify-end gap-3 mt-6">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => navigate('/users')}
              leftIcon={<X className="w-4 h-4" />}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              isLoading={isLoading}
              leftIcon={!isLoading ? <UserPlus className="w-4 h-4" /> : undefined}
            >
              {isEdit ? 'Actualizar usuario' : 'Crear usuario'}
            </Button>
          </div>
        </form>

      </div>
    </section>
  );
}