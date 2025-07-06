import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate, useParams } from 'react-router-dom';
import { FirebaseService } from '../../services/firebaseService';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { FirebaseError } from 'firebase/app';
import { Cliente } from '../../types';
import toast from 'react-hot-toast';
import { User, Phone, Home, Clock, FileText, Package, DollarSign } from 'lucide-react';

const schema = yup.object().shape({
  nombre: yup.string().required('Nombre requerido'),
  direccion: yup.string().required('Dirección requerida'),
  telefono: yup.string().required('Teléfono requerido'),
  frecuenciaVisita: yup.string().oneOf(['semanal', 'quincenal', 'mensual']).required('Frecuencia requerida'),
  diaVisita: yup.string().oneOf(['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']).required('Día de visita requerido'),
  observaciones: yup.string(),
  bidones10: yup.number().min(0, 'Cantidad inválida'),
  bidones20: yup.number().min(0, 'Cantidad inválida'),
  sodas: yup.number().min(0, 'Cantidad inválida'),
  envasesDevueltos: yup.number().min(0, 'Cantidad inválida'),
  total: yup.number().min(0, 'Importe inválido'),
  pagado: yup.boolean(),
});

type ClienteFormData = yup.InferType<typeof schema>;

export const ClienteForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ClienteFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      bidones10: 0,
      bidones20: 0,
      sodas: 0,
      envasesDevueltos: 0,
      total: 0,
      pagado: false,
    },
  });

  const loadCliente = useCallback(async (clienteId: string) => {
    setLoadingData(true);
    try {
      // Obtener el cliente
      const cliente = await FirebaseService.getDocument<Cliente>('clientes', clienteId);
      if (!cliente) {
        throw new Error('Cliente no encontrado');
      }

      // Cargar datos del cliente en el formulario
      setValue('nombre', cliente.nombre);
      setValue('telefono', cliente.telefono);
      setValue('direccion', cliente.direccion);
      setValue('frecuenciaVisita', cliente.frecuenciaVisita);
      setValue('diaVisita', cliente.diaVisita);
      setValue('observaciones', cliente.observaciones || '');
      
      // Cargar valores existentes del cliente o usar la última entrega
      setValue('bidones10', cliente.bidones10 || 0);
      setValue('bidones20', cliente.bidones20 || 0);
      setValue('sodas', cliente.sodas || 0);
      setValue('envasesDevueltos', cliente.envasesDevueltos || 0);
      setValue('total', cliente.total || 0);
      setValue('pagado', cliente.pagado || false);
      
      console.log('✅ Formulario actualizado correctamente');
      
    } catch (err) {
      console.error('❌ Error al cargar cliente:', err);
      toast.error('Error al cargar los datos del cliente');
      navigate('/clientes');
    } finally {
      setLoadingData(false);
    }
  }, [setValue, navigate]);

  useEffect(() => {
    if (isEdit && id) {
      loadCliente(id);
    }
  }, [isEdit, id, loadCliente]);

  const onSubmit = async (data: ClienteFormData) => {
    setLoading(true);
    try {
      const clienteData = {
        ...data,
        saldoPendiente: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (isEdit && id) {
        await FirebaseService.updateDocument<Cliente>('clientes', id, {
          ...clienteData,
          updatedAt: new Date(),
        });
        toast.success('Cliente actualizado correctamente');
      } else {
        await FirebaseService.createDocument<Cliente>('clientes', clienteData);
        toast.success('Cliente creado correctamente');
      }
      navigate('/clientes');
    } catch (err) {
      if (err instanceof FirebaseError) {
        console.error('Error detallado al guardar cliente:', {
          error: err,
          message: err.message,
          code: err.code,
          data: data
        });
        
        // Mensajes de error más específicos basados en el código de error de Firebase
        if (err.code === 'permission-denied') {
          toast.error('No tienes permisos para realizar esta acción');
        } else if (err.code === 'not-found') {
          toast.error('No se encontró el cliente a actualizar');
        } else if (err.code === 'already-exists') {
          toast.error('Ya existe un cliente con estos datos');
        } else {
          toast.error(`Error al guardar cliente: ${err.message}`);
        }
      } else {
        console.error('Error inesperado al guardar cliente:', err);
        toast.error('Error inesperado al guardar cliente');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Datos Básicos */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Datos Básicos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <User className="inline h-4 w-4 mr-2" />
                  Nombre
                </label>
                <input
                  {...register('nombre')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Nombre del cliente"
                />
                {errors.nombre && (
                  <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Phone className="inline h-4 w-4 mr-2" />
                  Teléfono
                </label>
                <input
                  {...register('telefono')}
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Número de teléfono"
                />
                {errors.telefono && (
                  <p className="mt-1 text-sm text-red-600">{errors.telefono.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Home className="inline h-4 w-4 mr-2" />
                  Dirección
                </label>
                <input
                  {...register('direccion')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Dirección completa"
                />
                {errors.direccion && (
                  <p className="mt-1 text-sm text-red-600">{errors.direccion.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Planificación */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Planificación
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Clock className="inline h-4 w-4 mr-2" />
                  Frecuencia de Visita
                </label>
                <select
                  {...register('frecuenciaVisita')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Seleccionar frecuencia</option>
                  <option value="semanal">Semanal</option>
                  <option value="quincenal">Quincenal</option>
                  <option value="mensual">Mensual</option>
                </select>
                {errors.frecuenciaVisita && (
                  <p className="mt-1 text-sm text-red-600">{errors.frecuenciaVisita.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Clock className="inline h-4 w-4 mr-2" />
                  Día de Visita
                </label>
                <select
                  {...register('diaVisita')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Seleccionar día</option>
                  <option value="lunes">Lunes</option>
                  <option value="martes">Martes</option>
                  <option value="miércoles">Miércoles</option>
                  <option value="jueves">Jueves</option>
                  <option value="viernes">Viernes</option>
                  <option value="sábado">Sábado</option>
                  <option value="domingo">Domingo</option>
                </select>
                {errors.diaVisita && (
                  <p className="mt-1 text-sm text-red-600">{errors.diaVisita.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FileText className="inline h-4 w-4 mr-2" />
                  Observaciones
                </label>
                <textarea
                  {...register('observaciones')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Observaciones adicionales"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Última Entrega */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Última Entrega
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Package className="inline h-4 w-4 mr-2" />
                  Bidones 10L
                </label>
                <input
                  {...register('bidones10')}
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="0"
                />
                {errors.bidones10 && (
                  <p className="mt-1 text-sm text-red-600">{errors.bidones10.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Package className="inline h-4 w-4 mr-2" />
                  Bidones 20L
                </label>
                <input
                  {...register('bidones20')}
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="0"
                />
                {errors.bidones20 && (
                  <p className="mt-1 text-sm text-red-600">{errors.bidones20.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Package className="inline h-4 w-4 mr-2" />
                  Sodas
                </label>
                <input
                  {...register('sodas')}
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="0"
                />
                {errors.sodas && (
                  <p className="mt-1 text-sm text-red-600">{errors.sodas.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Package className="inline h-4 w-4 mr-2" />
                  Envases Devueltos
                </label>
                <input
                  {...register('envasesDevueltos')}
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="0"
                />
                {errors.envasesDevueltos && (
                  <p className="mt-1 text-sm text-red-600">{errors.envasesDevueltos.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <DollarSign className="inline h-4 w-4 mr-2" />
                  Total
                </label>
                <input
                  {...register('total')}
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="0.00"
                />
                {errors.total && (
                  <p className="mt-1 text-sm text-red-600">{errors.total.message}</p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  {...register('pagado')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Pagado
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/clientes')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <LoadingSpinner size="sm" /> : isEdit ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};