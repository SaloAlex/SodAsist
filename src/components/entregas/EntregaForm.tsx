import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Entrega, Cliente, InventarioVehiculo } from '../../types';
import { FirebaseService } from '../../services/firebaseService';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
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
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { PRECIOS } from '../../config/precios';
// import { getTenantCollectionPath, getCurrentTenantId } from '../../config/tenantConfig';
import './EntregaForm.css';

// Schema dinámico que se actualiza con el inventario disponible
const createSchema = (inventario: InventarioVehiculo | null) => yup.object().shape({
  clienteId: yup.string().required('Cliente requerido'),
  sodas: yup.number()
    .min(0, 'Mínimo 0')
    .max(inventario?.sodas || 999, `Máximo ${inventario?.sodas || 0} disponibles`)
    .required('Cantidad requerida'),
  bidones10: yup.number()
    .min(0, 'Mínimo 0')
    .max(inventario?.bidones10 || 999, `Máximo ${inventario?.bidones10 || 0} disponibles`)
    .required('Cantidad requerida'),
  bidones20: yup.number()
    .min(0, 'Mínimo 0')
    .max(inventario?.bidones20 || 999, `Máximo ${inventario?.bidones20 || 0} disponibles`)
    .required('Cantidad requerida'),
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

type EntregaFormData = yup.InferType<ReturnType<typeof createSchema>>;

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
  const { user, userData } = useAuthStore();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [inventario, setInventario] = useState<InventarioVehiculo | null>(null);
  const [historialCliente, setHistorialCliente] = useState<HistorialEntrega[]>([]);
  const [clienteStats, setClienteStats] = useState<ClienteStats | null>(null);
  
  // Estados de UI
  const [currentStep, setCurrentStep] = useState(1);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [clienteSearchTerm, setClienteSearchTerm] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid: formIsValid },
    watch,
    setValue,
    trigger,
  } = useForm<EntregaFormData>({
    resolver: yupResolver(createSchema(inventario)),
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


  // Calcular total automáticamente
  useEffect(() => {
    const total = (sodasWatched || 0) * PRECIOS.soda + 
                  (bidones10Watched || 0) * PRECIOS.bidon10 + 
                  (bidones20Watched || 0) * PRECIOS.bidon20;
    setValue('total', total);
  }, [sodasWatched, bidones10Watched, bidones20Watched, setValue]); // Dependencias limpias

  // Revalidar formulario cuando cambie el inventario
  useEffect(() => {
    if (inventario) {
      trigger(); // Revalidar todos los campos
    }
  }, [inventario, trigger]);

  // Cargar datos iniciales
  useEffect(() => {
    loadClientes();
    loadInventario();
  }, []);

  // Cerrar dropdown cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.cliente-dropdown-container')) {
        setShowClienteDropdown(false);
      }
    };

    if (showClienteDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showClienteDropdown]);

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
      console.log('Loading inventario...');
      const inv = await FirebaseService.getInventarioActual();
      console.log('Inventario loaded:', inv);
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
    console.log('validarInventario called with data:', data);
    console.log('Current inventario:', inventario);
    
    if (!inventario) {
      console.log('No inventario available - allowing submission for now');
      toast('Inventario no disponible. La entrega se registrará sin validación de stock.', { icon: '⚠️' });
      return true; // Permitir la entrega temporalmente
    }

    const suficienteSodas = (inventario.sodas || 0) >= data.sodas;
    const suficienteBidones10 = (inventario.bidones10 || 0) >= data.bidones10;
    const suficienteBidones20 = (inventario.bidones20 || 0) >= data.bidones20;

    console.log('Stock validation:');
    console.log('- Sodas:', { available: inventario.sodas, requested: data.sodas, sufficient: suficienteSodas });
    console.log('- Bidones10:', { available: inventario.bidones10, requested: data.bidones10, sufficient: suficienteBidones10 });
    console.log('- Bidones20:', { available: inventario.bidones20, requested: data.bidones20, sufficient: suficienteBidones20 });

    if (!suficienteSodas) {
      console.log('Insufficient sodas stock');
      toast.error(`Stock insuficiente: Solo quedan ${inventario.sodas} sodas`);
    }
    if (!suficienteBidones10) {
      console.log('Insufficient bidones10 stock');
      toast.error(`Stock insuficiente: Solo quedan ${inventario.bidones10} bidones de 10L`);
    }
    if (!suficienteBidones20) {
      console.log('Insufficient bidones20 stock');
      toast.error(`Stock insuficiente: Solo quedan ${inventario.bidones20} bidones de 20L`);
    }

    const result = suficienteSodas && suficienteBidones10 && suficienteBidones20;
    console.log('Inventory validation result:', result);
    return result;
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
    console.log('onSubmit called with data:', data);
    console.log('Form is valid:', formIsValid);
    console.log('Current step:', currentStep);
    
    console.log('Validating inventory...');
    if (!validarInventario(data)) {
      console.log('Inventory validation failed');
      return;
    }
    console.log('Inventory validation passed');

    console.log('Setting loading to true...');
    setLoading(true);
    try {
      console.log('Starting try block...');
      console.log('User authenticated:', !!user);
      console.log('User data:', userData);
      console.log('User UID:', user?.uid);
      console.log('User email:', user?.email);
      console.log('User role:', userData?.rol);
      console.log('User tenantId:', userData?.tenantId);
      const now = new Date();
      if (!isValid(now)) {
        throw new Error('Error al generar la fecha');
      }
      console.log('Date validation passed');

      console.log('Creating entregaData...');
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
      console.log('entregaData created:', entregaData);

      console.log('Getting cliente reference...');
      // Usar el email del usuario como tenant ID
      const userTenantId = user?.email || 'default';
      const clienteCollectionPath = `tenants/${userTenantId}/clientes`;
      const clienteRef = doc(db, clienteCollectionPath, data.clienteId);
      console.log('Getting cliente document from path:', clienteCollectionPath);
      const clienteDoc = await getDoc(clienteRef);
      console.log('Cliente document retrieved:', clienteDoc.exists());
      
      let clienteData;
      if (clienteDoc.exists()) {
        clienteData = clienteDoc.data();
        console.log('Cliente found in tenant');
      } else {
        console.log('Cliente not found in tenant, creating from global collection...');
        // Buscar el cliente en la colección global
        const globalClienteRef = doc(db, 'clientes', data.clienteId);
        const globalClienteDoc = await getDoc(globalClienteRef);
        
        if (globalClienteDoc.exists()) {
          clienteData = globalClienteDoc.data();
          console.log('Cliente found in global collection, copying to tenant...');
          
          // Crear el cliente en el tenant
          await setDoc(clienteRef, {
            ...clienteData,
            tenantId: userTenantId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          console.log('Cliente created in tenant');
        } else {
          throw new Error('Cliente no encontrado en ninguna colección');
        }
      }
      
      let nuevoSaldo = clienteData?.saldoPendiente || 0;
      console.log('Current cliente saldo:', nuevoSaldo);

      if (data.pagado) {
        nuevoSaldo = Math.max(0, nuevoSaldo - data.total);
        console.log('Payment made, new saldo:', nuevoSaldo);
      } else {
        nuevoSaldo = nuevoSaldo + data.total;
        console.log('Payment pending, new saldo:', nuevoSaldo);
      }

      console.log('Creating batch...');
      const batch = writeBatch(db);
      const entregaCollectionPath = `tenants/${userTenantId}/entregas`;
      const entregaRef = doc(collection(db, entregaCollectionPath));
      console.log('Creating entrega in path:', entregaCollectionPath);

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
        console.log('Updating inventario...');
        const nuevoInventario = {
          ...inventario,
          sodas: (inventario.sodas || 0) - data.sodas,
          bidones10: (inventario.bidones10 || 0) - data.bidones10,
          bidones20: (inventario.bidones20 || 0) - data.bidones20,
          envasesDevueltos: (inventario.envasesDevueltos || 0) + data.envasesDevueltos,
          updatedAt: serverTimestamp()
        };

        const inventarioCollectionPath = `tenants/${userTenantId}/inventarioVehiculo`;
        batch.update(doc(db, inventarioCollectionPath, inventario.id), nuevoInventario);
        console.log('Inventario update added to batch in path:', inventarioCollectionPath);
      } else {
        console.log('No inventario to update - skipping inventario update');
      }

      console.log('Committing batch...');
      await batch.commit();
      console.log('Batch committed successfully');

      console.log('Showing success toast...');
      toast.success('Entrega registrada correctamente');
      console.log('Navigating to dashboard...');
      navigate('/dashboard');
    } catch (err) {
      console.error('Error al registrar entrega:', err);
      toast.error('Error al registrar entrega: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  // Componente de progreso - Responsive
  const StepProgress = () => (
    <div className="mb-6 sm:mb-8">
      {/* Versión móvil - Solo iconos */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                    ${isActive ? 'bg-blue-600 text-white shadow-lg scale-110' : 
                      isCompleted ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}
                  `}>
                    {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <p className={`text-xs font-medium mt-1 text-center ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {step.title}
                  </p>
                </div>
                
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-colors duration-300 ${
                    currentStep > step.id ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Versión desktop - Completa */}
      <div className="hidden sm:block">
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
    </div>
  );

  // Widget de inventario mejorado - Responsive
  const InventarioWidget = () => (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-blue-800 dark:text-blue-300">
              Inventario del Vehículo
            </h3>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Stock disponible en tu vehículo para entregas
            </p>
          </div>
        </div>
        <button
          onClick={loadInventario}
          className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded-lg transition-colors"
          title="Actualizar inventario del vehículo"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: 'Sodas', value: inventario?.sodas || 0, icon: Package, color: 'blue' },
          { label: 'Bidones 10L', value: inventario?.bidones10 || 0, icon: Package, color: 'green' },
          { label: 'Bidones 20L', value: inventario?.bidones20 || 0, icon: Package, color: 'purple' }
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="text-center p-2 sm:p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <Icon className={`h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-2 text-${color}-600 dark:text-${color}-400`} />
            <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
            {value === 0 && (
              <div className="mt-1 px-1 sm:px-2 py-0.5 bg-red-200 dark:bg-red-800/30 text-red-700 dark:text-red-300 text-xs rounded-full font-medium">
                Sin stock
              </div>
            )}
            {value > 0 && value < 5 && (
              <div className="mt-1 px-1 sm:px-2 py-0.5 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-xs rounded-full">
                Stock muy bajo
              </div>
            )}
            {value >= 5 && value < 10 && (
              <div className="mt-1 px-1 sm:px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 text-xs rounded-full">
                Stock bajo
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Información adicional del inventario */}
      {inventario && (
        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400">
            <span>Última actualización: {inventario.updatedAt ? new Date(inventario.updatedAt).toLocaleTimeString() : 'N/A'}</span>
            <span>Envases devueltos: {inventario.envasesDevueltos || 0}</span>
          </div>
        </div>
      )}
    </div>
  );

  // Panel de cliente mejorado - Responsive
  const ClientePanel = () => {
    if (!clienteSeleccionado) return null;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-3 sm:space-y-0">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {clienteSeleccionado.nombre}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{clienteSeleccionado.direccion}</span>
                </p>
              </div>
            </div>

            {(clienteSeleccionado?.saldoPendiente || 0) > 0 && (
              <div className="mt-3 flex items-center space-x-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-amber-800 dark:text-amber-200">
                  Saldo pendiente: ${(clienteSeleccionado?.saldoPendiente || 0).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end space-x-2">
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
              className="flex items-center px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800/30 transition-colors"
            >
              {loadingPredictions ? (
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Zap className="h-3 w-3 mr-1" />
              )}
              <span className="hidden sm:inline">Sugerir cantidades</span>
              <span className="sm:hidden">Sugerir</span>
            </button>
            
            <button
              onClick={() => {
                if (inventario) {
                  // Sugerir cantidades basadas en el stock disponible (máximo 50% del stock)
                  const sugerenciaSodas = Math.floor((inventario.sodas || 0) * 0.5);
                  const sugerenciaBidones10 = Math.floor((inventario.bidones10 || 0) * 0.5);
                  const sugerenciaBidones20 = Math.floor((inventario.bidones20 || 0) * 0.5);
                  
                  setValue('sodas', sugerenciaSodas);
                  setValue('bidones10', sugerenciaBidones10);
                  setValue('bidones20', sugerenciaBidones20);
                  
                  toast.success('Cantidades sugeridas basadas en stock disponible');
                }
              }}
              className="flex items-center px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-colors"
              title="Sugerir cantidades basadas en stock disponible"
            >
              <Package className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Usar stock</span>
              <span className="sm:hidden">Stock</span>
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
              
              {/* Selector personalizado responsive */}
              <div className="relative cliente-dropdown-container">
                {/* Campo de búsqueda */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={clienteSearchTerm}
                    onChange={(e) => setClienteSearchTerm(e.target.value)}
                    onFocus={() => setShowClienteDropdown(true)}
                    className="w-full px-3 py-2 pl-12 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm cliente-search-input"
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <button
                    type="button"
                    onClick={() => setShowClienteDropdown(!showClienteDropdown)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Dropdown de clientes */}
                {showClienteDropdown && (
                  <div className="cliente-dropdown">
                    {clientes
                      .filter(cliente => 
                        cliente.nombre.toLowerCase().includes(clienteSearchTerm.toLowerCase()) ||
                        cliente.direccion.toLowerCase().includes(clienteSearchTerm.toLowerCase())
                      )
                      .map((cliente) => (
                        <button
                          key={cliente.id}
                          type="button"
                          onClick={() => {
                            if (cliente.id) {
                              setValue('clienteId', cliente.id);
                              handleClienteChange(cliente.id);
                              setClienteSearchTerm(`${cliente.nombre} - ${cliente.direccion}`);
                              setShowClienteDropdown(false);
                            }
                          }}
                          className="cliente-option focus:outline-none"
                        >
                          <div className="cliente-info">
                            <span className="cliente-nombre">
                              {cliente.nombre}
                            </span>
                            <span className="cliente-direccion">
                              {cliente.direccion}
                            </span>
                            {cliente.telefono && (
                              <span className="cliente-telefono">
                                📞 {cliente.telefono}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    
                    {/* Mensaje cuando no hay resultados */}
                    {clientes.filter(cliente => 
                      cliente.nombre.toLowerCase().includes(clienteSearchTerm.toLowerCase()) ||
                      cliente.direccion.toLowerCase().includes(clienteSearchTerm.toLowerCase())
                    ).length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                        No se encontraron clientes
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Información adicional */}
              <div className="entrega-form-tip">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  💡 <strong>Tip:</strong> Escribe para buscar o toca la flecha para ver todos los clientes
                </p>
              </div>
              
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
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Productos a Entregar
                </h3>
                <button
                  onClick={() => setShowCalculator(!showCalculator)}
                  className={`flex items-center justify-center px-4 py-3 text-sm font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 w-full sm:w-auto min-w-[140px] calculator-button ${
                    showCalculator 
                      ? 'bg-gradient-to-r from-green-600 to-green-700 active' 
                      : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                  } text-white`}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">
                    {showCalculator ? 'Ocultar Calculadora' : 'Mostrar Calculadora'}
                  </span>
                  <span className="sm:hidden">
                    {showCalculator ? 'Ocultar' : 'Calcular'}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {[
                  { name: 'sodas', label: 'Sodas', price: PRECIOS.soda, icon: Package },
                  { name: 'bidones10', label: 'Bidones 10L', price: PRECIOS.bidon10, icon: Package },
                  { name: 'bidones20', label: 'Bidones 20L', price: PRECIOS.bidon20, icon: Package },
                  { name: 'envasesDevueltos', label: 'Envases Devueltos', price: 0, icon: Package }
                ].map(({ name, label, price, icon: Icon }) => {
                  const stockDisponible = inventario && name !== 'envasesDevueltos' 
                    ? (inventario[name as keyof InventarioVehiculo] as number) || 0 
                    : null;
                  const cantidadSolicitada = allValues[name as keyof EntregaFormData] as number || 0;
                  const excedeStock = stockDisponible !== null && cantidadSolicitada > stockDisponible;
                  
                  return (
                    <div key={name} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        <Icon className="inline h-4 w-4 mr-2" />
                        {label} {price > 0 && <span className="text-gray-500 text-xs sm:text-sm">(${price} c/u)</span>}
                      </label>
                      <div className="relative">
                        <input
                          {...register(name as keyof EntregaFormData, { valueAsNumber: true })}
                          type="number"
                          min="0"
                          max={stockDisponible !== null ? stockDisponible : undefined}
                          className={`w-full px-3 py-2 text-base sm:text-sm border rounded-lg focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                            excedeStock 
                              ? 'border-red-300 focus:ring-red-500 bg-red-50 dark:bg-red-900/20' 
                              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                          }`}
                        />
                        {stockDisponible !== null && (
                          <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-xs ${
                            excedeStock ? 'text-red-600 dark:text-red-400' : 'text-gray-500'
                          }`}>
                            Stock: {stockDisponible}
                          </div>
                        )}
                      </div>
                      
                      {/* Alertas de stock - Solo una por producto */}
                      {excedeStock && (
                        <div className="flex items-center space-x-1 text-xs text-red-600 dark:text-red-400">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Excede el stock disponible ({stockDisponible})</span>
                        </div>
                      )}
                      
                      {!excedeStock && stockDisponible === 0 && (
                        <div className="flex items-center space-x-1 text-xs text-red-600 dark:text-red-400">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Sin stock disponible</span>
                        </div>
                      )}
                      
                      {!excedeStock && stockDisponible !== null && stockDisponible < 5 && stockDisponible > 0 && (
                        <div className="flex items-center space-x-1 text-xs text-orange-600 dark:text-orange-400">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Stock muy bajo</span>
                        </div>
                      )}
                      
                      {errors[name as keyof EntregaFormData] && (
                        <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                          {errors[name as keyof EntregaFormData]?.message}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Calculadora visual mejorada */}
              {showCalculator && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3 flex items-center">
                    <Calculator className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                    Desglose de Precios
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-600 dark:text-gray-300">
                        Sodas: {allValues.sodas} × ${PRECIOS.soda}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        ${((allValues.sodas || 0) * PRECIOS.soda).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-600 dark:text-gray-300">
                        Bidones 10L: {allValues.bidones10} × ${PRECIOS.bidon10}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        ${((allValues.bidones10 || 0) * PRECIOS.bidon10).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-600 dark:text-gray-300">
                        Bidones 20L: {allValues.bidones20} × ${PRECIOS.bidon20}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        ${((allValues.bidones20 || 0) * PRECIOS.bidon20).toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t border-gray-300 dark:border-gray-500 pt-3 flex justify-between items-center font-semibold text-base">
                      <span className="text-gray-700 dark:text-gray-200">Total:</span>
                      <span className="text-green-600 dark:text-green-400 font-bold">
                        ${allValues.total?.toFixed(2) || '0.00'}
                      </span>
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center mb-4">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Información de Pago
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Total a Cobrar
                  </label>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                          <div className="flex flex-col sm:flex-row sm:items-center items-center p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-300 peer-checked:border-blue-500 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/20 transition-colors">
                            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 dark:text-gray-400 peer-checked:text-blue-600 dark:peer-checked:text-blue-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1 sm:mt-0 sm:ml-2">{label}</span>
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center mb-4">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Resumen de Entrega
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                      <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium text-gray-900 dark:text-white">{allValues.sodas}</span> Sodas</p>
                    )}
                    {allValues.bidones10 > 0 && (
                      <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium text-gray-900 dark:text-white">{allValues.bidones10}</span> Bidones 10L</p>
                    )}
                    {allValues.bidones20 > 0 && (
                      <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium text-gray-900 dark:text-white">{allValues.bidones20}</span> Bidones 20L</p>
                    )}
                    {allValues.envasesDevueltos > 0 && (
                      <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium text-gray-900 dark:text-white">{allValues.envasesDevueltos}</span> Envases Devueltos</p>
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
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header simplificado - Responsive */}
      <div className="mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mr-2 sm:mr-3" />
            Nueva Entrega
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Registra una nueva entrega de productos
          </p>
        </div>
      </div>

      {/* Progreso del wizard */}
      <StepProgress />

      {/* Contenido del formulario */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {renderCurrentStep()}

        {/* Botones de navegación - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700 space-y-3 sm:space-y-0">
          <button
            type="button"
            onClick={currentStep === 1 ? () => navigate('/dashboard') : prevStep}
            className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentStep === 1 ? 'Cancelar' : 'Anterior'}
          </button>

          <div className="flex items-center space-x-3">
            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center justify-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
              >
                Siguiente
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || !formIsValid}
                onClick={async () => {
                  console.log('Submit button clicked');
                  console.log('Loading:', loading);
                  console.log('Form valid:', formIsValid);
                  console.log('Current step:', currentStep);
                  
                  // Forzar validación del formulario
                  const isValid = await trigger();
                  console.log('Trigger validation result:', isValid);
                  
                  if (!isValid) {
                    console.log('Form validation failed');
                    return;
                  }
                }}
                className="flex items-center justify-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Registrando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Confirmar Entrega</span>
                    <span className="sm:hidden">Confirmar</span>
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