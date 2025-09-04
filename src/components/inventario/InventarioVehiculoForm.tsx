import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { 
  Truck, 
  Save, 
  X, 
  Package,
  AlertTriangle
} from 'lucide-react';
import { InventarioVehiculo } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

const schema = yup.object().shape({
  sodas: yup.number().min(0, 'Mínimo 0').required('Cantidad requerida'),
  bidones10: yup.number().min(0, 'Mínimo 0').required('Cantidad requerida'),
  bidones20: yup.number().min(0, 'Mínimo 0').required('Cantidad requerida'),
  envasesDevueltos: yup.number().min(0, 'Mínimo 0').required('Cantidad requerida'),
});

type InventarioVehiculoFormData = yup.InferType<typeof schema>;

interface InventarioVehiculoFormProps {
  inventarioActual?: InventarioVehiculo | null;
  onSave?: (inventario: InventarioVehiculo) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const InventarioVehiculoForm: React.FC<InventarioVehiculoFormProps> = ({
  inventarioActual,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!inventarioActual);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm<InventarioVehiculoFormData>({
    resolver: yupResolver(schema),
    defaultValues: inventarioActual ? {
      sodas: inventarioActual.sodas || 0,
      bidones10: inventarioActual.bidones10 || 0,
      bidones20: inventarioActual.bidones20 || 0,
      envasesDevueltos: inventarioActual.envasesDevueltos || 0,
    } : {
      sodas: 0,
      bidones10: 0,
      bidones20: 0,
      envasesDevueltos: 0,
    }
  });

  const watchedValues = watch();

  // Calcular total de productos
  const totalProductos = watchedValues.sodas + watchedValues.bidones10 + watchedValues.bidones20;

  const onSubmit = async (data: InventarioVehiculoFormData) => {
    if (!user?.email) {
      toast.error('Usuario no autenticado');
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const userTenantId = user.email;
      const inventarioCollectionPath = `tenants/${userTenantId}/inventarioVehiculo`;
      
      const inventarioData: Omit<InventarioVehiculo, 'id'> = {
        fecha: now,
        sodas: data.sodas,
        bidones10: data.bidones10,
        bidones20: data.bidones20,
        envasesDevueltos: data.envasesDevueltos,
        updatedAt: now,
      };

      // Si estamos editando un inventario existente, usar su ID
      const docId = inventarioActual?.id || `inventario_${now.getTime()}`;
      const inventarioRef = doc(db, inventarioCollectionPath, docId);
      
      await setDoc(inventarioRef, {
        ...inventarioData,
        createdAt: inventarioActual?.fecha ? inventarioActual.fecha : serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const inventarioGuardado: InventarioVehiculo = {
        id: docId,
        ...inventarioData
      };

      toast.success('Inventario del vehículo guardado correctamente');
      onSave?.(inventarioGuardado);
      
      if (!inventarioActual) {
        reset();
      }
    } catch (error) {
      console.error('Error al guardar inventario:', error);
      toast.error('Error al guardar inventario del vehículo');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (inventarioActual) {
      setIsEditing(false);
      reset();
    } else {
      onCancel?.();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Truck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Inventario del Vehículo
          </h3>
        </div>
        
        {inventarioActual && !isEditing && (
          <button
            onClick={handleEdit}
            className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Package className="h-4 w-4 mr-2" />
            Editar
          </button>
        )}
      </div>

      {inventarioActual && !isEditing ? (
        // Vista de solo lectura
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Stock Actual del Vehículo
              </span>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-300">
              Última actualización: {inventarioActual.fecha.toLocaleDateString()}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Sodas', value: inventarioActual.sodas, color: 'blue' },
              { label: 'Bidones 10L', value: inventarioActual.bidones10, color: 'green' },
              { label: 'Bidones 20L', value: inventarioActual.bidones20, color: 'purple' },
              { label: 'Envases Devueltos', value: inventarioActual.envasesDevueltos, color: 'orange' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <div className={`text-2xl font-bold text-${color}-600 dark:text-${color}-400`}>
                  {value}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {label}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                Total de Productos: {inventarioActual.sodas + inventarioActual.bidones10 + inventarioActual.bidones20}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Formulario de edición
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                {inventarioActual ? 'Actualizar Inventario' : 'Cargar Stock Inicial'}
              </span>
            </div>
            <p className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">
              {inventarioActual 
                ? 'Modifica las cantidades actuales del inventario del vehículo'
                : 'Registra el stock inicial que llevas en el camión para hoy'
              }
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { name: 'sodas', label: 'Sodas', placeholder: '0' },
              { name: 'bidones10', label: 'Bidones 10L', placeholder: '0' },
              { name: 'bidones20', label: 'Bidones 20L', placeholder: '0' },
              { name: 'envasesDevueltos', label: 'Envases Devueltos', placeholder: '0' },
            ].map(({ name, label, placeholder }) => (
              <div key={name}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {label}
                </label>
                <input
                  {...register(name as keyof InventarioVehiculoFormData, { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder={placeholder}
                />
                {errors[name as keyof InventarioVehiculoFormData] && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors[name as keyof InventarioVehiculoFormData]?.message}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                Total de Productos: {totalProductos}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Sodas + Bidones 10L + Bidones 20L
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </button>
            
            <button
              type="submit"
              disabled={loading || isLoading}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading || isLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {inventarioActual ? 'Actualizar' : 'Guardar'} Inventario
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
