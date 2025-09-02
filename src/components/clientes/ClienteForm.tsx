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
import { User, Phone, Home, Clock, FileText, Package } from 'lucide-react';
import { DireccionInput } from '../common/DireccionInput';
import { DireccionDetalles } from '../../types';

const schema = yup.object().shape({
  nombre: yup.string().required('Nombre requerido'),
  direccion: yup.string().required('Dirección requerida'),
  direccionDetalles: yup.object().shape({
    placeId: yup.string().required('ID de lugar requerido'),
    direccionCompleta: yup.string().required('Dirección completa requerida'),
    direccionNormalizada: yup.string().required('Dirección normalizada requerida'),
    calle: yup.string().optional(),
    numero: yup.string().optional(),
    colonia: yup.string().optional(),
    ciudad: yup.string().optional(),
    estado: yup.string().optional(),
    codigoPostal: yup.string().optional(),
    pais: yup.string().required('País requerido'),
    coords: yup.object({
      lat: yup.number().required('Latitud requerida'),
      lng: yup.number().required('Longitud requerida')
    }).required('Coordenadas requeridas')
  }).required('Detalles de dirección requeridos'),
  telefono: yup.string().required('Teléfono requerido'),
  frecuenciaVisita: yup.string().oneOf(['semanal', 'quincenal', 'mensual']).required('Frecuencia requerida'),
  diaVisita: yup.string().oneOf(['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']).required('Día de visita requerido'),
  observaciones: yup.string().optional(),
  bidones10: yup.number().min(0, 'Cantidad inválida').optional(),
  bidones20: yup.number().min(0, 'Cantidad inválida').optional(),
  sodas: yup.number().min(0, 'Cantidad inválida').optional(),
  envasesDevueltos: yup.number().min(0, 'Cantidad inválida').optional(),
  total: yup.number().min(0, 'Importe inválido').optional(),
  pagado: yup.boolean().optional(),
});

type ClienteFormData = yup.InferType<typeof schema>;

export const ClienteForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [direccionError, setDireccionError] = useState<string | null>(null);
  const [clienteToEdit, setClienteToEdit] = useState<Cliente | null>(null);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
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

  const direccion = watch('direccion');

  const loadCliente = useCallback(async (clienteId: string) => {
    setLoadingData(true);
    try {
      const cliente = await FirebaseService.getDocument<Cliente>('clientes', clienteId);
      if (cliente) {
        console.log('🔍 Cliente cargado:', cliente);
        setClienteToEdit(cliente);
        setValue('nombre', cliente.nombre);
        setValue('telefono', cliente.telefono);
        setValue('direccion', cliente.direccion);
        setValue('frecuenciaVisita', cliente.frecuenciaVisita);
        setValue('diaVisita', cliente.diaVisita);
        setValue('observaciones', cliente.observaciones || '');

        if (cliente.direccionDetalles) {
          console.log('📍 Dirección detalles encontrados:', cliente.direccionDetalles);
          setValue('direccionDetalles', cliente.direccionDetalles);
          setCoords(cliente.direccionDetalles.coords);
        } else if (cliente.coords) {
          console.log('📍 Coordenadas encontradas:', cliente.coords);
          // Si no hay direccionDetalles pero sí hay coords, crear un objeto básico
          setCoords(cliente.coords);
        }
        
        console.log('📝 Valores establecidos en el formulario');
      }
    } catch (error) {
      console.error('Error al cargar cliente:', error);
      toast.error('Error al cargar los datos del cliente');
    } finally {
      setLoadingData(false);
    }
  }, [setValue]);

  useEffect(() => {
    if (id) {
      loadCliente(id);
    }
  }, [id, loadCliente]);

  const onSubmit = async (data: ClienteFormData) => {
    // En modo de edición, permitir usar coordenadas existentes si no hay nuevas
    if (!coords && !isEdit) {
      setDireccionError('Por favor, selecciona una dirección válida del autocompletado');
      return;
    }
    
    // Si estamos editando y no hay nuevas coordenadas, usar las existentes
    if (isEdit && !coords && clienteToEdit?.coords) {
      setCoords(clienteToEdit.coords);
    }
    
    // Asegurar que tenemos coordenadas válidas
    if (!coords) {
      setDireccionError('Por favor, selecciona una dirección válida del autocompletado');
      return;
    }

    setLoading(true);
    try {
      const clienteData: Omit<Cliente, 'id'> = {
        nombre: data.nombre,
        telefono: data.telefono,
        direccion: data.direccion,
        direccionDetalles: data.direccionDetalles || undefined,
        coords,
        frecuenciaVisita: data.frecuenciaVisita,
        diaVisita: data.diaVisita,
        observaciones: data.observaciones,
        bidones10: data.bidones10,
        bidones20: data.bidones20,
        sodas: data.sodas,
        envasesDevueltos: data.envasesDevueltos,
        total: data.total,
        pagado: data.pagado,
        saldoPendiente: 0, // Este valor se establecerá después para actualizaciones
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (isEdit && id) {
        // Obtener el cliente actual para mantener el saldoPendiente
        const clienteActual = await FirebaseService.getDocument<Cliente>('clientes', id);
        if (!clienteActual) {
          throw new Error('Cliente no encontrado');
        }

        await FirebaseService.updateDocument<Cliente>('clientes', id, {
          ...clienteData,
          saldoPendiente: clienteActual.saldoPendiente || 0,
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
          {isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
          {/* Datos Básicos */}
          <div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4">
              Datos Básicos
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <User className="inline h-4 w-4 mr-2" />
                  Nombre
                </label>
                <input
                  {...register('nombre')}
                  type="text"
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Número de teléfono"
                />
                {errors.telefono && (
                  <p className="mt-1 text-sm text-red-600">{errors.telefono.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4">
              Dirección
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Home className="inline h-4 w-4 mr-2" />
                  Dirección
                </label>
                
                {/* En modo de edición, mostrar input simple si ya hay dirección */}
                {isEdit && direccion ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={direccion}
                      onChange={(e) => setValue('direccion', e.target.value)}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Dirección del cliente"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Para cambiar la ubicación en el mapa, usa el campo de búsqueda de abajo
                    </p>
                  </div>
                ) : null}
                
                {/* Campo de búsqueda de dirección */}
                <DireccionInput
                  value={isEdit ? '' : direccion} // En modo de edición, empezar vacío para nueva búsqueda
                  onChange={(detalles: DireccionDetalles) => {
                    setValue('direccion', detalles.direccionCompleta);
                    setValue('direccionDetalles', detalles);
                    setCoords(detalles.coords);
                    setDireccionError(null);
                  }}
                  onError={setDireccionError}
                  placeholder={isEdit ? "Buscar nueva dirección..." : "Buscar dirección..."}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                
                {errors.direccion && (
                  <p className="mt-1 text-sm text-red-600">{errors.direccion.message}</p>
                )}
                {direccionError && (
                  <p className="mt-1 text-sm text-red-600">{direccionError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Configuración de Visitas */}
          <div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4">
              Configuración de Visitas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Clock className="inline h-4 w-4 mr-2" />
                  Frecuencia de Visita
                </label>
                <select
                  {...register('frecuenciaVisita')}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-4">
              Información Adicional
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FileText className="inline h-4 w-4 mr-2" />
                Observaciones
              </label>
              <textarea
                {...register('observaciones')}
                rows={3}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
                placeholder="Notas adicionales sobre el cliente..."
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 sm:flex-none sm:min-w-[120px] flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  {isEdit ? 'Actualizar' : 'Crear'} Cliente
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={() => navigate('/clientes')}
              className="flex-1 sm:flex-none sm:min-w-[120px] flex items-center justify-center px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};