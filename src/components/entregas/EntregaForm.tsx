import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Entrega, Cliente, InventarioVehiculo } from '../../types';
import { FirebaseService } from '../../services/firebaseService';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { 
  Package, 
  DollarSign,
  User,
  CreditCard,
  FileText,
  AlertTriangle,
  Truck
} from 'lucide-react';
import { isValid } from 'date-fns';
import toast from 'react-hot-toast';
import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { PRECIOS } from '../../config/precios';

const schema = yup.object().shape({
  clienteId: yup.string().required('Cliente requerido'),
  sodas: yup.number().min(0, 'Mínimo 0').required('Cantidad requerida'),
  bidones10: yup.number().min(0, 'Mínimo 0').required('Cantidad requerida'),
  bidones20: yup.number().min(0, 'Mínimo 0').required('Cantidad requerida'),
  envasesDevueltos: yup.number().min(0, 'Mínimo 0').required('Cantidad requerida'),
  total: yup.number().min(0, 'Mínimo 0').required('Total requerido'),
  pagado: yup.boolean().required(),
  medioPago: yup.string().when('pagado', {
    is: true,
    then: (schema) => schema.oneOf(['efectivo', 'transferencia', 'tarjeta'] as const, 'Medio de pago inválido').required('Medio de pago requerido'),
    otherwise: (schema) => schema.nullable(),
  }),
  observaciones: yup.string(),
});

type EntregaFormData = yup.InferType<typeof schema>;

export const EntregaForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [inventario, setInventario] = useState<InventarioVehiculo | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<EntregaFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      sodas: 0,
      bidones10: 0,
      bidones20: 0,
      envasesDevueltos: 0,
      total: 0,
      pagado: false,
    },
  });

  const watchedValues = watch(['sodas', 'bidones10', 'bidones20']);

  useEffect(() => {
    loadClientes();
    loadInventario();
  }, []);

  useEffect(() => {
    const [sodas, bidones10, bidones20] = watchedValues;
    const total = (sodas || 0) * PRECIOS.soda + 
                  (bidones10 || 0) * PRECIOS.bidon10 + 
                  (bidones20 || 0) * PRECIOS.bidon20;
    setValue('total', total);
  }, [watchedValues, setValue]);

  const loadInventario = async () => {
    try {
      const inv = await FirebaseService.getInventarioActual();
      setInventario(inv);
    } catch (err) {
      console.error('Error al cargar inventario:', err);
      toast.error('Error al cargar inventario del vehículo');
    }
  };

  const validarInventario = (data: EntregaFormData): boolean => {
    if (!inventario) return false;

    const suficienteSodas = (inventario.sodas || 0) >= data.sodas;
    const suficienteBidones10 = (inventario.bidones10 || 0) >= data.bidones10;
    const suficienteBidones20 = (inventario.bidones20 || 0) >= data.bidones20;

    if (!suficienteSodas) {
      toast.error(`Stock insuficiente: Solo quedan ${inventario.sodas} sodas`);
    }
    if (!suficienteBidones10) {
      toast.error(`Stock insuficiente: Solo quedan ${inventario.bidones10} bidones de 10L`);
    }
    if (!suficienteBidones20) {
      toast.error(`Stock insuficiente: Solo quedan ${inventario.bidones20} bidones de 20L`);
    }

    return suficienteSodas && suficienteBidones10 && suficienteBidones20;
  };

  const handleClienteChange = useCallback(async (clienteId: string) => {
    if (!clienteId) {
      setClienteSeleccionado(null);
      return;
    }

    try {
      const cliente = await FirebaseService.getDocument<Cliente>('clientes', clienteId);
      if (cliente) {
        setClienteSeleccionado(cliente);
        setValue('clienteId', clienteId);
        
        const ultimaEntrega = await FirebaseService.getUltimaEntregaCliente(clienteId);
        if (ultimaEntrega) {
          setValue('bidones10', ultimaEntrega.bidones10 || 0);
          setValue('bidones20', ultimaEntrega.bidones20 || 0);
          setValue('sodas', ultimaEntrega.sodas || 0);
          setValue('envasesDevueltos', ultimaEntrega.envasesDevueltos || 0);
        }
      }
    } catch (error) {
      console.error('Error al cargar cliente:', error);
      toast.error('Error al cargar los datos del cliente');
    }
  }, [setValue]);

  const loadClientes = async () => {
    try {
      const data = await FirebaseService.getCollection<Cliente>('clientes');
      setClientes(data);
    } catch (err) {
      toast.error('Error al cargar clientes: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    }
  };

  useEffect(() => {
    const loadClienteFromUrl = async () => {
      const params = new URLSearchParams(location.search);
      const clienteId = params.get('clienteId');
      
      if (clienteId) {
        await handleClienteChange(clienteId);
      }
    };

    loadClienteFromUrl();
  }, [location.search, handleClienteChange]);

  const onSubmit = async (data: EntregaFormData) => {
    if (!validarInventario(data)) {
      return;
    }

    setLoading(true);
    try {
      // Crear la fecha actual y asegurarnos de que sea válida
      const now = new Date();
      if (!isValid(now)) {
        throw new Error('Error al generar la fecha');
      }

      // Crear el objeto de entrega sin campos undefined
      const entregaData: Omit<Entrega, 'id'> = {
        clienteId: data.clienteId,
        sodas: data.sodas,
        bidones10: data.bidones10,
        bidones20: data.bidones20,
        envasesDevueltos: data.envasesDevueltos,
        total: data.total,
        pagado: data.pagado,
        fecha: now,
        createdAt: now,
        // Solo incluir observaciones si tiene un valor válido
        ...(data.observaciones && data.observaciones.trim() && { observaciones: data.observaciones }),
        // Solo incluir medioPago si está pagado y tiene un valor válido
        ...(data.pagado && data.medioPago && { medioPago: data.medioPago as 'efectivo' | 'transferencia' | 'tarjeta' })
      };

      // Obtener el saldo actual del cliente para calcular el nuevo saldo
      const clienteRef = doc(db, 'clientes', data.clienteId);
      const clienteDoc = await getDoc(clienteRef);
      const clienteData = clienteDoc.data();
      let nuevoSaldo = clienteData?.saldoPendiente || 0;

      // Calcular el nuevo saldo pendiente
      if (data.pagado) {
        // Si está pagado, reducir el saldo pendiente anterior
        nuevoSaldo = Math.max(0, nuevoSaldo - data.total);
      } else {
        // Si no está pagado, agregar al saldo pendiente
        nuevoSaldo = nuevoSaldo + data.total;
      }

      // Crear batch para operación atómica
      // Utilizamos writeBatch para actualizar tanto la entrega como el cliente
      // de manera atómica. Esto evita dependencias de Cloud Functions y garantiza
      // que los datos estén disponibles inmediatamente en el documento del cliente.
      const batch = writeBatch(db);
      const entregaRef = doc(collection(db, 'entregas')); // auto-id

      // 1. Crear nueva entrega
      batch.set(entregaRef, entregaData);

      // 2. Actualizar cliente con snapshot de la entrega
      batch.update(clienteRef, {
        bidones10: data.bidones10,
        bidones20: data.bidones20,
        sodas: data.sodas,
        envasesDevueltos: data.envasesDevueltos,
        total: data.total,
        pagado: data.pagado,
        saldoPendiente: nuevoSaldo,
        updatedAt: serverTimestamp(),
      });

      // Actualizar el inventario después de la entrega
      if (inventario) {
        const nuevoInventario = {
          ...inventario,
          sodas: (inventario.sodas || 0) - data.sodas,
          bidones10: (inventario.bidones10 || 0) - data.bidones10,
          bidones20: (inventario.bidones20 || 0) - data.bidones20,
          envasesDevueltos: (inventario.envasesDevueltos || 0) + data.envasesDevueltos,
          updatedAt: serverTimestamp()
        };

        batch.update(doc(db, 'inventarioVehiculo', inventario.id), nuevoInventario);
      }

      // Ejecutar operación atómica
      await batch.commit();

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Batch completado exitosamente');
        console.log('📦 Entrega creada:', entregaRef.id);
        console.log('👤 Cliente actualizado:', data.clienteId);
        console.log('💰 Nuevo saldo:', nuevoSaldo);
      }

      toast.success('Entrega registrada correctamente');
      navigate('/dashboard');
    } catch (err) {
      console.error('Error al registrar entrega:', err);
      toast.error('Error al registrar entrega: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Nueva Entrega
        </h1>

        {/* Información del Inventario */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-300">
              Inventario Disponible
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Sodas:</span>
              <span className="ml-2 font-semibold">{inventario?.sodas || 0}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Bidones 10L:</span>
              <span className="ml-2 font-semibold">{inventario?.bidones10 || 0}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Bidones 20L:</span>
              <span className="ml-2 font-semibold">{inventario?.bidones20 || 0}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <User className="inline h-4 w-4 mr-2" />
              Cliente
            </label>
            <select
              {...register('clienteId')}
              onChange={(e) => handleClienteChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">Seleccionar cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre} - {cliente.direccion}
                </option>
              ))}
            </select>
            {errors.clienteId && (
              <p className="mt-1 text-sm text-red-600">{errors.clienteId.message}</p>
            )}
          </div>

          {/* Información del Cliente Seleccionado */}
          {clienteSeleccionado && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {clienteSeleccionado.nombre}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {clienteSeleccionado.direccion}
                  </p>
                </div>
                {clienteSeleccionado.saldoPendiente > 0 && (
                  <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-semibold">
                      Saldo pendiente: ${clienteSeleccionado.saldoPendiente}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Package className="inline h-4 w-4 mr-2" />
                Sodas (${PRECIOS.soda} c/u)
              </label>
              <input
                {...register('sodas', { valueAsNumber: true })}
                type="number"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {errors.sodas && (
                <p className="mt-1 text-sm text-red-600">{errors.sodas.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Package className="inline h-4 w-4 mr-2" />
                Bidones 10L (${PRECIOS.bidon10} c/u)
              </label>
              <input
                {...register('bidones10', { valueAsNumber: true })}
                type="number"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {errors.bidones10 && (
                <p className="mt-1 text-sm text-red-600">{errors.bidones10.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Package className="inline h-4 w-4 mr-2" />
                Bidones 20L (${PRECIOS.bidon20} c/u)
              </label>
              <input
                {...register('bidones20', { valueAsNumber: true })}
                type="number"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {errors.bidones20 && (
                <p className="mt-1 text-sm text-red-600">{errors.bidones20.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Package className="inline h-4 w-4 mr-2" />
                Envases Devueltos
              </label>
              <input
                {...register('envasesDevueltos', { valueAsNumber: true })}
                type="number"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {errors.envasesDevueltos && (
                <p className="mt-1 text-sm text-red-600">{errors.envasesDevueltos.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <DollarSign className="inline h-4 w-4 mr-2" />
              Total
            </label>
            <input
              {...register('total', { valueAsNumber: true })}
              type="number"
              min="0"
              step="0.01"
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                {...register('pagado')}
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Pagado
              </span>
            </label>
          </div>

          {watch('pagado') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <CreditCard className="inline h-4 w-4 mr-2" />
                Medio de Pago
              </label>
              <select
                {...register('medioPago')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Seleccionar medio</option>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
              </select>
              {errors.medioPago && (
                <p className="mt-1 text-sm text-red-600">{errors.medioPago.message}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="inline h-4 w-4 mr-2" />
              Observaciones
            </label>
            <textarea
              {...register('observaciones')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Observaciones adicionales..."
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Registrar Entrega'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};