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
  Truck,
  Calculator,
  MapPin,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Save,
  Zap,
  History,
  Info,
  RefreshCw,
  ShoppingCart,
  Calendar
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

interface HistorialEntrega {
  fecha: Date;
  sodas: number;
  bidones10: number;
  bidones20: number;
  total: number;
  pagado: boolean;
}

interface ClienteStats {
  totalEntregas: number;
  promedioMensual: number;
  productoFavorito: string;
  ticketPromedio: number;
  ultimaVisita: Date | null;
}

export const EntregaForm: React.FC = () => {
  // Estados principales
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [inventario, setInventario] = useState<InventarioVehiculo | null>(null);
  const [historialCliente, setHistorialCliente] = useState<HistorialEntrega[]>([]);
  const [clienteStats, setClienteStats] = useState<ClienteStats | null>(null);
  
  // Estados de UI
  const [currentStep, setCurrentStep] = useState(1);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid: formIsValid },
    watch,
    setValue,
    getValues,
    trigger,
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
    mode: 'onChange'
  });

  const watchedValues = watch(['sodas', 'bidones10', 'bidones20']);
  const allValues = watch();

  // Valores individuales de watchedValues para dependencias limpias en useEffect
  const sodasWatched = watchedValues[0];
  const bidones10Watched = watchedValues[1];
  const bidones20Watched = watchedValues[2];

  // Pasos del wizard
  const steps = [
    {
      id: 1,
      title: 'Cliente',
      description: 'Seleccionar cliente y ver historial',
      icon: User,
      fields: ['clienteId']
    },
    {
      id: 2,
      title: 'Productos',
      description: 'Cantidades y productos a entregar',
      icon: Package,
      fields: ['sodas', 'bidones10', 'bidones20', 'envasesDevueltos']
    },
    {
      id: 3,
      title: 'Pago',
      description: 'Información de pago y total',
      icon: DollarSign,
      fields: ['total', 'pagado', 'medioPago']
    },
    {
      id: 4,
      title: 'Confirmación',
      description: 'Revisar y confirmar entrega',
      icon: CheckCircle,
      fields: ['observaciones']
    }
  ];

  // Auto-guardado
  useEffect(() => {
    if (!autoSaveEnabled) return;
    
    const timer = setTimeout(() => {
      const formData = getValues();
      localStorage.setItem('entrega_draft', JSON.stringify({
        ...formData,
        timestamp: new Date().toISOString()
      }));
    }, 2000);

    return () => clearTimeout(timer);
  }, [autoSaveEnabled, sodasWatched, bidones10Watched, bidones20Watched, clienteSeleccionado?.id, getValues]); // Dependencias específicas y getValues agregado

  // Cargar borrador al iniciar
  useEffect(() => {
    const draft = localStorage.getItem('entrega_draft');
    if (draft) {
      try {
        const draftData = JSON.parse(draft);
        const draftAge = Date.now() - new Date(draftData.timestamp).getTime();
        
        // Solo cargar si el borrador es de menos de 1 hora
        if (draftAge < 60 * 60 * 1000) {
          Object.keys(draftData).forEach(key => {
            if (key !== 'timestamp' && draftData[key] !== undefined) {
              setValue(key as keyof EntregaFormData, draftData[key]);
            }
          });
          toast.success('Borrador cargado automáticamente');
        }
      } catch (error) {
        console.error('Error al cargar borrador:', error);
      }
    }
  }, [setValue]); // setValue es estable y evita warning de dependencia

  // Calcular total automáticamente
  useEffect(() => {
    const total = (sodasWatched || 0) * PRECIOS.soda + 
                  (bidones10Watched || 0) * PRECIOS.bidon10 + 
                  (bidones20Watched || 0) * PRECIOS.bidon20;
    setValue('total', total);
  }, [sodasWatched, bidones10Watched, bidones20Watched, setValue]); // Dependencias limpias

  // Cargar datos iniciales
  useEffect(() => {
    loadClientes();
    loadInventario();
  }, []);

  // Cargar cliente desde URL
  useEffect(() => {
    const loadClienteFromUrl = async () => {
      const params = new URLSearchParams(location.search);
      const clienteId = params.get('clienteId');
      
      if (clienteId) {
        try {
          const cliente = await FirebaseService.getDocument<Cliente>('clientes', clienteId);
          if (cliente) {
            setClienteSeleccionado(cliente);
            setValue('clienteId', clienteId);
          }
        } catch (error) {
          console.error('Error al cargar cliente:', error);
        }
      }
    };

    loadClienteFromUrl();
  }, [location.search, setValue]);

  const loadInventario = async () => {
    try {
      const inv = await FirebaseService.getInventarioActual();
      setInventario(inv);
    } catch (err) {
      console.error('Error al cargar inventario:', err);
      toast.error('Error al cargar inventario del vehículo');
    }
  };

  const loadClientes = async () => {
    try {
      const data = await FirebaseService.getCollection<Cliente>('clientes');
      setClientes(data);
    } catch (err) {
      toast.error('Error al cargar clientes: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    }
  };

  const loadClienteHistory = async (_clienteId: string) => {
    // Usamos la variable para evitar warning de no-unused-vars
    void _clienteId;
    try {
      // Simular carga de historial - en producción conectar con Firebase
      const mockHistory: HistorialEntrega[] = [
        {
          fecha: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          sodas: 12,
          bidones10: 2,
          bidones20: 1,
          total: 450,
          pagado: true
        },
        {
          fecha: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          sodas: 10,
          bidones10: 2,
          bidones20: 2,
          total: 520,
          pagado: false
        }
      ];
      
      setHistorialCliente(mockHistory);
      
      // Calcular estadísticas
      const stats: ClienteStats = {
        totalEntregas: mockHistory.length,
        promedioMensual: mockHistory.length * 2, // Simulado
        productoFavorito: 'Sodas',
        ticketPromedio: mockHistory.reduce((sum, h) => sum + h.total, 0) / mockHistory.length,
        ultimaVisita: mockHistory[0]?.fecha || null
      };
      
      setClienteStats(stats);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    }
  };

  const generatePredictions = async (_clienteId: string) => {
    // Usamos la variable para evitar warning de no-unused-vars
    void _clienteId;
    setLoadingPredictions(true);
    try {
      // Simular predicciones inteligentes basadas en historial
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (historialCliente.length > 0) {
        const avgSodas = Math.round(historialCliente.reduce((sum, h) => sum + h.sodas, 0) / historialCliente.length);
        const avgBidones10 = Math.round(historialCliente.reduce((sum, h) => sum + h.bidones10, 0) / historialCliente.length);
        const avgBidones20 = Math.round(historialCliente.reduce((sum, h) => sum + h.bidones20, 0) / historialCliente.length);
        
        setValue('sodas', avgSodas);
        setValue('bidones10', avgBidones10);
        setValue('bidones20', avgBidones20);
        
        toast.success('Cantidades sugeridas aplicadas basadas en historial');
      }
    } catch (error) {
      console.error('Error al generar predicciones:', error);
      toast.error('Error al generar predicciones');
    } finally {
      setLoadingPredictions(false);
    }
  };

  const handleClienteChange = useCallback(async (clienteId: string) => {
    if (!clienteId) {
      setClienteSeleccionado(null);
      setHistorialCliente([]);
      setClienteStats(null);
      return;
    }

    try {
      const cliente = await FirebaseService.getDocument<Cliente>('clientes', clienteId);
      if (cliente) {
        setClienteSeleccionado(cliente);
        setValue('clienteId', clienteId);
        
        // Cargar historial y estadísticas
        await loadClienteHistory(clienteId);
        
        // Aplicar última entrega si existe
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

  const nextStep = async () => {
    const currentStepData = steps.find(s => s.id === currentStep);
    if (currentStepData) {
      const isStepValid = await trigger(currentStepData.fields as (keyof EntregaFormData)[]);
      if (isStepValid) {
        setCurrentStep(prev => Math.min(prev + 1, steps.length));
      }
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data: EntregaFormData) => {
    if (!validarInventario(data)) {
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      if (!isValid(now)) {
        throw new Error('Error al generar la fecha');
      }

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
        ...(data.observaciones && data.observaciones.trim() && { observaciones: data.observaciones }),
        ...(data.pagado && data.medioPago && { medioPago: data.medioPago as 'efectivo' | 'transferencia' | 'tarjeta' })
      };

      const clienteRef = doc(db, 'clientes', data.clienteId);
      const clienteDoc = await getDoc(clienteRef);
      const clienteData = clienteDoc.data();
      let nuevoSaldo = clienteData?.saldoPendiente || 0;

      if (data.pagado) {
        nuevoSaldo = Math.max(0, nuevoSaldo - data.total);
      } else {
        nuevoSaldo = nuevoSaldo + data.total;
      }

      const batch = writeBatch(db);
      const entregaRef = doc(collection(db, 'entregas'));

      batch.set(entregaRef, entregaData);

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

      await batch.commit();

      // Limpiar borrador
      localStorage.removeItem('entrega_draft');

      toast.success('Entrega registrada correctamente');
      navigate('/dashboard');
    } catch (err) {
      console.error('Error al registrar entrega:', err);
      toast.error('Error al registrar entrega: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  // Componente de progreso
  const StepProgress = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                  ${isActive ? 'bg-blue-600 text-white shadow-lg scale-110' : 
                    isCompleted ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}
                `}>
                  {isCompleted ? <CheckCircle className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                </div>
                <div className="mt-2 text-center">
                  <p className={`text-sm font-medium ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 max-w-20">
                    {step.description}
                  </p>
                </div>
              </div>
              
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 transition-colors duration-300 ${
                  currentStep > step.id ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  // Widget de inventario mejorado
  const InventarioWidget = () => (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300">
            Inventario Disponible
          </h3>
        </div>
        <button
          onClick={loadInventario}
          className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded-lg transition-colors"
          title="Actualizar inventario"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Sodas', value: inventario?.sodas || 0, icon: Package, color: 'blue' },
          { label: 'Bidones 10L', value: inventario?.bidones10 || 0, icon: Package, color: 'green' },
          { label: 'Bidones 20L', value: inventario?.bidones20 || 0, icon: Package, color: 'purple' }
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <Icon className={`h-6 w-6 mx-auto mb-2 text-${color}-600 dark:text-${color}-400`} />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
            {value < 10 && (
              <div className="mt-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-full">
                Stock bajo
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // Panel de cliente mejorado
  const ClientePanel = () => {
    if (!clienteSeleccionado) return null;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {clienteSeleccionado.nombre}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <MapPin className="h-3 w-3 mr-1" />
                  {clienteSeleccionado.direccion}
                </p>
              </div>
            </div>

                         {(clienteSeleccionado?.saldoPendiente || 0) > 0 && (
               <div className="mt-3 flex items-center space-x-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                 <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                 <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                   Saldo pendiente: ${(clienteSeleccionado?.saldoPendiente || 0).toFixed(2)}
                 </span>
               </div>
             )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Ver historial"
            >
              <History className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => generatePredictions(clienteSeleccionado.id!)}
              disabled={loadingPredictions}
              className="flex items-center px-3 py-1.5 text-sm bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800/30 transition-colors"
            >
              {loadingPredictions ? (
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Zap className="h-3 w-3 mr-1" />
              )}
              Sugerir cantidades
            </button>
          </div>
        </div>

        {/* Estadísticas del cliente */}
        {clienteStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{clienteStats.totalEntregas}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Entregas</p>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-lg font-bold text-gray-900 dark:text-white">${clienteStats.ticketPromedio.toFixed(0)}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Ticket Promedio</p>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{clienteStats.productoFavorito}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Favorito</p>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{clienteStats.promedioMensual}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Mensual</p>
            </div>
          </div>
        )}

        {/* Historial expandible */}
        {showHistory && historialCliente.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Últimas entregas</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {historialCliente.map((entrega, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {entrega.fecha.toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-900 dark:text-white">
                      {entrega.sodas}S + {entrega.bidones10}B10 + {entrega.bidones20}B20
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      entrega.pagado 
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                    }`}>
                      ${entrega.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Renderizar paso actual
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <InventarioWidget />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <User className="inline h-4 w-4 mr-2" />
                Seleccionar Cliente
              </label>
              <select
                {...register('clienteId')}
                onChange={(e) => handleClienteChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="">Buscar y seleccionar cliente...</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre} - {cliente.direccion}
                  </option>
                ))}
              </select>
              {errors.clienteId && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.clienteId.message}</p>
              )}
            </div>

            <ClientePanel />
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <ClientePanel />
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Productos a Entregar
                </h3>
                <button
                  onClick={() => setShowCalculator(!showCalculator)}
                  className="flex items-center px-3 py-1.5 text-sm bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800/30 transition-colors"
                >
                  <Calculator className="h-3 w-3 mr-1" />
                  Calculadora
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { name: 'sodas', label: 'Sodas', price: PRECIOS.soda, icon: Package },
                  { name: 'bidones10', label: 'Bidones 10L', price: PRECIOS.bidon10, icon: Package },
                  { name: 'bidones20', label: 'Bidones 20L', price: PRECIOS.bidon20, icon: Package },
                  { name: 'envasesDevueltos', label: 'Envases Devueltos', price: 0, icon: Package }
                ].map(({ name, label, price, icon: Icon }) => (
                  <div key={name} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Icon className="inline h-4 w-4 mr-2" />
                      {label} {price > 0 && <span className="text-gray-500">(${price} c/u)</span>}
                    </label>
                    <div className="relative">
                      <input
                        {...register(name as keyof EntregaFormData, { valueAsNumber: true })}
                        type="number"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                      {inventario && name !== 'envasesDevueltos' && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                          Stock: {(() => {
                            const value = inventario[name as keyof InventarioVehiculo];
                            return typeof value === 'number' ? value : 0;
                          })()}
                        </div>
                      )}
                    </div>
                    {errors[name as keyof EntregaFormData] && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {errors[name as keyof EntregaFormData]?.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Calculadora visual */}
              {showCalculator && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Desglose de Precios</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Sodas: {allValues.sodas} × ${PRECIOS.soda}</span>
                      <span>${((allValues.sodas || 0) * PRECIOS.soda).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bidones 10L: {allValues.bidones10} × ${PRECIOS.bidon10}</span>
                      <span>${((allValues.bidones10 || 0) * PRECIOS.bidon10).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bidones 20L: {allValues.bidones20} × ${PRECIOS.bidon20}</span>
                      <span>${((allValues.bidones20 || 0) * PRECIOS.bidon20).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-300 dark:border-gray-600 pt-2 flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>${allValues.total?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center mb-4">
                <DollarSign className="h-5 w-5 mr-2" />
                Información de Pago
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Total a Cobrar
                  </label>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    ${allValues.total?.toFixed(2) || '0.00'}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    {...register('pagado')}
                    type="checkbox"
                    id="pagado"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="pagado" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Marcar como pagado
                  </label>
                </div>

                {allValues.pagado && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      <CreditCard className="inline h-4 w-4 mr-2" />
                      Medio de Pago
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'efectivo', label: 'Efectivo', icon: DollarSign },
                        { value: 'transferencia', label: 'Transferencia', icon: CreditCard },
                        { value: 'tarjeta', label: 'Tarjeta', icon: CreditCard }
                      ].map(({ value, label, icon: Icon }) => (
                        <label key={value} className="relative">
                          <input
                            {...register('medioPago')}
                            type="radio"
                            value={value}
                            className="sr-only peer"
                          />
                          <div className="flex flex-col items-center p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-300 peer-checked:border-blue-500 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/20 transition-colors">
                            <Icon className="h-6 w-6 text-gray-600 dark:text-gray-400 peer-checked:text-blue-600 dark:peer-checked:text-blue-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">{label}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                    {errors.medioPago && (
                      <p className="text-sm text-red-600 dark:text-red-400">{errors.medioPago.message}</p>
                    )}
                  </div>
                )}

                {!allValues.pagado && clienteSeleccionado && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm text-amber-800 dark:text-amber-200">
                        Se agregará ${allValues.total?.toFixed(2)} al saldo pendiente del cliente
                      </span>
                    </div>
                                         <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                       Nuevo saldo: ${(((clienteSeleccionado?.saldoPendiente || 0) + (allValues.total || 0)).toFixed(2))}
                     </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            {/* Resumen de la entrega */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center mb-4">
                <CheckCircle className="h-5 w-5 mr-2" />
                Resumen de Entrega
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cliente</h4>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="font-medium text-gray-900 dark:text-white">{clienteSeleccionado?.nombre}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{clienteSeleccionado?.direccion}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Productos</h4>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-1">
                    {allValues.sodas > 0 && (
                      <p className="text-sm"><span className="font-medium">{allValues.sodas}</span> Sodas</p>
                    )}
                    {allValues.bidones10 > 0 && (
                      <p className="text-sm"><span className="font-medium">{allValues.bidones10}</span> Bidones 10L</p>
                    )}
                    {allValues.bidones20 > 0 && (
                      <p className="text-sm"><span className="font-medium">{allValues.bidones20}</span> Bidones 20L</p>
                    )}
                    {allValues.envasesDevueltos > 0 && (
                      <p className="text-sm"><span className="font-medium">{allValues.envasesDevueltos}</span> Envases Devueltos</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pago</h4>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">${allValues.total?.toFixed(2)}</p>
                    <p className={`text-sm ${allValues.pagado ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {allValues.pagado ? `Pagado - ${allValues.medioPago}` : 'Pendiente de pago'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FileText className="inline h-4 w-4 mr-2" />
                Observaciones (Opcional)
              </label>
              <textarea
                {...register('observaciones')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Agregar observaciones sobre la entrega..."
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header mejorado */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <Package className="h-8 w-8 text-blue-600 mr-3" />
              Nueva Entrega
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Registra una nueva entrega de productos
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Save className="h-4 w-4 mr-1" />
              {autoSaveEnabled ? 'Auto-guardado activo' : 'Auto-guardado desactivado'}
            </div>
            
            <button
              onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                autoSaveEnabled 
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
              title={`${autoSaveEnabled ? 'Desactivar' : 'Activar'} auto-guardado`}
            >
              <Save className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Progreso del wizard */}
      <StepProgress />

      {/* Contenido del formulario */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {renderCurrentStep()}

        {/* Botones de navegación */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={currentStep === 1 ? () => navigate('/dashboard') : prevStep}
            className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentStep === 1 ? 'Cancelar' : 'Anterior'}
          </button>

          <div className="flex items-center space-x-3">
            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Siguiente
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || !formIsValid}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Registrando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmar Entrega
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};