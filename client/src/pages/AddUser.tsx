import { useState, useEffect, useMemo, useRef, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { X, AlertCircle, CheckCircle2, UserPlus, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserService } from '../services/user.service';
import { WarehouseService } from '../services/warehouse.service';
import type { WarehouseOption } from '../types/inventory';
import type { Role, CreateUserData, User } from '../types/user';
import { validateRun, formatRun } from '../utils/run';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';

type EditableUser = User & { rut?: string };

interface UserPayload {
  name: string;
  email: string;
  role: Role;
  rut?: string;
  assignedWarehouseId: number | null;
  password?: string;
}

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'VENDEDOR', label: 'Vendedor' },
  { value: 'BODEGUERO', label: 'Bodeguero' },
  { value: 'ADMIN', label: 'Administrador' },
];

export default function AddUser() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const editingUser = (location.state as { user?: EditableUser } | null)?.user;
  const isEdit = Boolean(editingUser);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);

  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initialRun = editingUser?.run || editingUser?.rut || '';

  const [formData, setFormData] = useState<CreateUserData>({
    run: initialRun ? formatRun(initialRun) : '',
    name: editingUser?.name || '',
    email: editingUser?.email || '',
    password: '',
    confirmPassword: '',
    role: editingUser?.role || 'VENDEDOR',
    assignedWarehouseId: editingUser?.assignedWarehouseId || '',
  });

  // Limpia el timeout de redirección si el componente se desmonta antes de cumplirse
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!accessToken) return;

    let isMounted = true;
    WarehouseService.getActive(accessToken)
      .then((res) => {
        if (isMounted && res.success) {
          setWarehouses(res.data);
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        console.error('Error cargando bodegas:', message);
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!isEdit && (!formData.run || !validateRun(formData.run))) {
      errors.run = 'El RUN ingresado no es válido';
    }

    if (formData.name.trim().length < 2) {
      errors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Debe ingresar un correo electrónico válido';
    }

    // Valida contraseña siempre al crear, o al editar si se ingresó una nueva
    const shouldValidatePassword = !isEdit || Boolean(formData.password);
    if (shouldValidatePassword) {
      if (!formData.password || formData.password.length < 8) {
        errors.password = 'La contraseña debe tener al menos 8 caracteres';
      }
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Las contraseñas no coinciden';
      }
    }

    if (
      (formData.role === 'VENDEDOR' || formData.role === 'BODEGUERO') &&
      !formData.assignedWarehouseId
    ) {
      errors.warehouse = 'Debe asignar una bodega para este rol';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !accessToken) return;

    setIsLoading(true);
    setFeedback(null);

    const payload: UserPayload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      role: formData.role,
      assignedWarehouseId:formData.assignedWarehouseId
      ? Number(formData.assignedWarehouseId)
      : null,
    };

    if (!isEdit) {
      payload.rut = formData.run.replace(/\./g, '').toUpperCase();
    }

    if (formData.password) {
      payload.password = formData.password;
    }

    try {
      const data =
        isEdit && editingUser
          ? await UserService.update(accessToken, editingUser.id, payload)
          : await UserService.create(accessToken, payload);

      setFeedback({
        type: 'success',
        message: data.message || `Usuario ${isEdit ? 'actualizado' : 'creado'} exitosamente.`,
      });

      redirectTimeoutRef.current = setTimeout(() => {
        navigate('/users');
      }, 1500);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Ocurrió un error inesperado al guardar el usuario';
      setFeedback({ type: 'error', message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRun(e.target.value);
    setFormData((prev) => ({ ...prev, run: formatted }));
    if (formErrors.run) {
      setFormErrors((prev) => ({ ...prev, run: '' }));
    }
  };

  const warehouseOptions = useMemo(
    () => [
      { value: '', label: 'Seleccione una Bodega' },
      ...warehouses.map((wh) => ({ value: wh.id, label: wh.name })),
    ],
    [warehouses]
  );

  return (
    <section className="items-center justify-center flex">
      <div className="max-w-xl w-full">
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-gray-900">
            {isEdit ? 'Editar usuario' : 'Crear usuario'}
          </h1>
          <p className="text-gray-500 mt-1 text-[15px]">
            {isEdit
              ? 'Actualice los datos del usuario en el sistema'
              : 'Crea nuevos usuarios para el sistema'}
          </p>
        </div>

        {feedback && (
          <div
            role={feedback.type === 'error' ? 'alert' : 'status'}
            aria-live={feedback.type === 'error' ? 'assertive' : 'polite'}
            className={`mb-6 p-4 rounded-xl border flex items-center gap-3 text-sm ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mb-12">
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-gray-100 flex flex-col gap-5">
            <Input
              label="Nombre completo"
              required
              placeholder="Ej: Ana Torres"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
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
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              error={formErrors.email}
            />

            <Input
              label={isEdit ? 'Nueva contraseña (opcional)' : 'Contraseña inicial'}
              type="password"
              required={!isEdit}
              placeholder="Mínimo 8 caracteres"
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              error={formErrors.password}
            />

            <Input
              label="Confirmar contraseña"
              type="password"
              required={!isEdit || Boolean(formData.password)}
              placeholder="Repita la contraseña"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
              }
              error={formErrors.confirmPassword}
            />

            <Select
              label="Rol"
              required
              value={formData.role}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  role: e.target.value as Role,
                  assignedWarehouseId: '',
                }))
              }
              options={ROLE_OPTIONS}
            />

            <div className="bg-blue-50 text-blue-700 p-4 rounded-lg flex gap-3 items-start mt-1 border border-blue-100">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-[14px] leading-snug font-medium">
                Los permisos del usuario se asignarán automáticamente según el rol seleccionado.
              </p>
            </div>

            {(formData.role === 'VENDEDOR' || formData.role === 'BODEGUERO') && (
              <Select
                label="Bodega Asignada"
                required
                value={formData.assignedWarehouseId || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, assignedWarehouseId: e.target.value }))
                }
                options={warehouseOptions}
                error={formErrors.warehouse}
              />
            )}
          </div>

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