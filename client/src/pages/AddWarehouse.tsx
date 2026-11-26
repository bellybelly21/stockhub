import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Save, X, AlertCircle } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { WarehouseService } from '../services/warehouse.service';

export default function AddWarehouse() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = formData.name.trim();
    const trimmedLocation = formData.location.trim();

    if (trimmedName.length < 2) {
      setError('El nombre de la bodega debe tener al menos 2 caracteres.');
      return;
    }

    if (trimmedLocation.length > 0 && trimmedLocation.length < 2) {
      setError('La ubicación debe tener al menos 2 caracteres.');
      return;
    }

    if (!accessToken) return;

    setIsSubmitting(true);

    try {
      const payload: { name: string; location?: string } = {
        name: trimmedName,
      };
      if (trimmedLocation) {
        payload.location = trimmedLocation;
      }

      await WarehouseService.create(accessToken, payload);
      navigate('/warehouses');
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="max-w-5xl mx-auto flex flex-col gap-6 mb-12 px-4 sm:px-0">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-dark tracking-tight">
          Nueva bodega
        </h1>
        <p className="text-slate-mid mt-1 text-sm">
          Complete los campos para registrar una nueva bodega o sucursal
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-danger text-danger text-sm font-medium flex items-center gap-2 rounded-md">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="bg-white rounded-xl border border-light-gray p-5 sm:p-6">
          <h2 className="text-sm font-bold text-dark-different mb-4 uppercase tracking-wide">
            Información de la bodega
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-dark mb-1.5">
                Nombre <span className="text-danger">*</span>
              </label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ej: Bodega Central"
                maxLength={100}
                required
              />
              <p className="text-xs text-slate-light mt-1.5">
                El nombre debe ser único en el sistema.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-dark mb-1.5">
                Ubicación
              </label>
              <Input
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Ej: Av. Industrial 1234, Santiago"
                maxLength={200}
              />
              <p className="text-xs text-slate-light mt-1.5">
                Opcional. Dirección o referencia física.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 mt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/warehouses')}
            disabled={isSubmitting}
            leftIcon={<X size={18} />}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            isLoading={isSubmitting}
            leftIcon={!isSubmitting && <Save size={18} />}
            className="w-full sm:w-auto"
          >
            Guardar bodega
          </Button>
        </div>
      </form>
    </section>
  );
}