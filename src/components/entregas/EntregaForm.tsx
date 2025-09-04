import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Entrega, Cliente, Producto } from '../../types';
import { FirebaseService } from '../../services/firebaseService';
import { ProductosService } from '../../services/productosService';
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
  Calendar,
  X,
  Plus,
  Clock
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
// import { getTenantCollectionPath, getCurrentTenantId } from '../../config/tenantConfig';
import './EntregaForm.css';

// Schema dinámico que se actualiza con los productos disponibles
const createSchema = (productos: Producto[]) => {
  const schemaFields: Record<string, yup.AnySchema> = {
    clienteId: yup.string().required('Cliente requerido'),
    total: yup.number()
      .transform((_value, originalValue) => {
        // Si el valor original es una cadena vacía o no es un número válido, devolver 0
        if (originalValue === '' || originalValue === null || originalValue === undefined) {
          return 0;
        }
        const num = Number(originalValue);
        return isNaN(num) ? 0 : num;
      })
      .min(0, 'Mínimo 0')
      .required('Total requerido'),
    pagado: yup.boolean().required(),
    medioPago: yup.string().when('pagado', {
      is: true,
      then: (schema) => schema.oneOf(['efectivo', 'transferencia', 'tarjeta'] as const, 'Medio de pago inválido').required('Medio de pago requerido'),
      otherwise: (schema) => schema.nullable(),
    }),
    observaciones: yup.string(),
    envasesDevueltos: yup.number()
      .transform((_value, originalValue) => {
        // Si el valor original es una cadena vacía o no es un número válido, devolver 0
        if (originalValue === '' || originalValue === null || originalValue === undefined) {
          return 0;
        }
        const num = Number(originalValue);
        return isNaN(num) ? 0 : num;
      })
      .min(0, 'Mínimo 0')
      .required('Cantidad requerida'),
  };

  // Agregar campos dinámicos para cada producto
  productos.forEach(producto => {
    const fieldName = `producto_${producto.id}`;
    schemaFields[fieldName] = yup.number()
      .transform((_value, originalValue) => {
        // Si el valor original es una cadena vacía o no es un número válido, devolver 0
        if (originalValue === '' || originalValue === null || originalValue === undefined) {
          return 0;
        }
        const num = Number(originalValue);
        return isNaN(num) ? 0 : num;
      })
      .min(0, 'Mínimo 0')
      .max(producto.stock || 999, `Máximo ${producto.stock || 0} disponibles`)
      .required('Cantidad requerida');
  });

  return yup.object().shape(schemaFields);
};

type EntregaFormData = {
  clienteId: string;
  total: number;
  pagado: boolean;
  medioPago?: string;
  observaciones?: string;
  envasesDevueltos: number;
  [key: string]: string | number | boolean | undefined; // Para campos dinámicos de productos
};

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
  const { user } = useAuthStore();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [historialCliente, setHistorialCliente] = useState<HistorialEntrega[]>([]);
  const [clienteStats, setClienteStats] = useState<ClienteStats | null>(null);
  
  // Estados de UI
  const [currentStep, setCurrentStep] = useState(1);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [clienteSearchTerm, setClienteSearchTerm] = useState('');
  const [showConfirmacionEntrega, setShowConfirmacionEntrega] = useState(false);
  const [entregaRegistrada, setEntregaRegistrada] = useState<{
    clienteId: string;
    productos: { productoId: string; cantidad: number; precio: number; nombre: string; subtotal: number }[];
    envasesDevueltos: number;
    total: number;
    pagado: boolean;
    medioPago?: string;
    observaciones?: string;
    cliente: Cliente;
    nuevoSaldo: number;
    fechaRegistro: Date;
  } | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid: formIsValid },
    watch,
    setValue,
    trigger,
    reset,
  } = useForm<EntregaFormData>({
    resolver: yupResolver(createSchema(productos)) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
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

  const allValues = watch();

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
      fields: ['envasesDevueltos']
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


  // Calcular total dinámicamente
  const totalCalculado = useMemo(() => {
    if (productos.length === 0) return 0;
    
    let total = 0;
    productos.forEach(producto => {
      const fieldName = `producto_${producto.id}`;
      const cantidad = allValues[fieldName] as number || 0;
      total += cantidad * producto.precioVenta;
    });
    
    return total;
  }, [productos, allValues]);

  // No actualizar el campo total automáticamente para evitar bucles infinitos
  // El total se calcula dinámicamente y se usa directamente en la UI

  // Revalidar formulario cuando cambien los productos
  useEffect(() => {
    if (productos.length > 0) {
      trigger(); // Revalidar todos los campos
    }
  }, [productos, trigger]);

  // Cargar datos iniciales
  useEffect(() => {
    loadClientes();
    loadProductos();
  }, []);

  // Recargar productos cuando el usuario regresa a la página
  useEffect(() => {
    const handleFocus = () => {
      loadProductos();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadProductos();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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


  const loadProductos = async () => {
    try {
      const productosData = await ProductosService.getProductos({ activo: true });
      setProductos(productosData);
    } catch (err) {
      console.error('Error al cargar productos:', err);
      toast.error('Error al cargar productos');
      setProductos([]);
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
    if (!productos || productos.length === 0) {
      toast('Productos no disponibles. La entrega se registrará sin validación de stock.', { 
        icon: '⚠️',
        duration: 5000
      });
      return true; // Permitir la entrega temporalmente
    }

    let todosLosProductosDisponibles = true;

    // Validar cada producto dinámicamente
    productos.forEach(producto => {
      const fieldName = `producto_${producto.id}`;
      const cantidadSolicitada = (data[fieldName] as number) || 0;
      const stockDisponible = producto.stock || 0;

      if (cantidadSolicitada > stockDisponible) {
        toast.error(`Stock insuficiente: Solo quedan ${stockDisponible} ${producto.nombre}`);
        todosLosProductosDisponibles = false;
      }
    });

    return todosLosProductosDisponibles;
  };

  // Función para calcular días de vencimiento
  const calcularDiasVencimiento = (fechaUltimaEntrega?: Date): number => {
    if (!fechaUltimaEntrega) return 0;
    const hoy = new Date();
    const diffTime = hoy.getTime() - fechaUltimaEntrega.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Función para obtener el estado del cliente
  const obtenerEstadoCliente = () => {
    if (!clienteSeleccionado) return null;

    const saldoPendiente = clienteSeleccionado.saldoPendiente || 0;
    const diasVencimiento = calcularDiasVencimiento(clienteSeleccionado.ultimaEntregaFecha);
    
    let estado = 'al-dia';
    let mensaje = 'Cliente al día';
    let color = 'green';
    let icono = '✅';

    if (saldoPendiente > 0) {
      if (diasVencimiento > 30) {
        estado = 'vencido';
        mensaje = `Deuda vencida (${diasVencimiento} días)`;
        color = 'red';
        icono = '🚨';
      } else if (diasVencimiento > 15) {
        estado = 'atrasado';
        mensaje = `Deuda atrasada (${diasVencimiento} días)`;
        color = 'orange';
        icono = '⚠️';
      } else {
        estado = 'deuda';
        mensaje = 'Tiene deuda pendiente';
        color = 'yellow';
        icono = '💰';
      }
    } else if (diasVencimiento > 60) {
      estado = 'inactivo';
      mensaje = `Cliente inactivo (${diasVencimiento} días)`;
      color = 'gray';
      icono = '😴';
    }

    return {
      estado,
      mensaje,
      color,
      icono,
      saldoPendiente,
      diasVencimiento
    };
  };

  const nextStep = async () => {
    const currentStepData = steps.find(s => s.id === currentStep);
    if (currentStepData) {
      const isStepValid = await trigger(currentStepData.fields as string[]);
      if (isStepValid) {
        setCurrentStep(prev => Math.min(prev + 1, steps.length));
      }
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Función para finalizar la entrega y navegar al dashboard
  const handleFinalizarEntrega = () => {
    setShowConfirmacionEntrega(false);
    setEntregaRegistrada(null);
    navigate('/dashboard');
  };

  // Función para hacer otra entrega
  const handleNuevaEntrega = () => {
    setShowConfirmacionEntrega(false);
    setEntregaRegistrada(null);
    setCurrentStep(1);
    // Resetear el formulario
    reset();
    setClienteSeleccionado(null);
    setHistorialCliente([]);
    setClienteStats(null);
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
      // Crear array de productos entregados
      const productosEntregados = productos
        .map(producto => {
          const fieldName = `producto_${producto.id}`;
          const cantidad = (data[fieldName] as number) || 0;
          return cantidad > 0 ? {
            productoId: producto.id!,
            nombre: producto.nombre,
            cantidad,
            precio: producto.precioVenta,
            subtotal: cantidad * producto.precioVenta
          } : null;
        })
        .filter((producto): producto is NonNullable<typeof producto> => producto !== null);

      const entregaData: Omit<Entrega, 'id'> = {
        clienteId: data.clienteId,
        productos: productosEntregados,
        envasesDevueltos: data.envasesDevueltos,
        total: totalCalculado,
        pagado: data.pagado,
        fecha: now,
        createdAt: now,
        ...(data.observaciones && data.observaciones.trim() && { observaciones: data.observaciones }),
        ...(data.pagado && data.medioPago && { medioPago: data.medioPago as 'efectivo' | 'transferencia' | 'tarjeta' })
      };

      // Usar el email del usuario como tenant ID
      const userTenantId = user?.email || 'default';
      const clienteCollectionPath = `tenants/${userTenantId}/clientes`;
      const clienteRef = doc(db, clienteCollectionPath, data.clienteId);
      const clienteDoc = await getDoc(clienteRef);
      
      let clienteData;
      if (clienteDoc.exists()) {
        clienteData = clienteDoc.data();
      } else {
        // Buscar el cliente en la colección global
        const globalClienteRef = doc(db, 'clientes', data.clienteId);
        const globalClienteDoc = await getDoc(globalClienteRef);
        
        if (globalClienteDoc.exists()) {
          clienteData = globalClienteDoc.data();
          
          // Crear el cliente en el tenant
          await setDoc(clienteRef, {
            ...clienteData,
            tenantId: userTenantId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } else {
          throw new Error('Cliente no encontrado en ninguna colección');
        }
      }
      
      let nuevoSaldo = clienteData?.saldoPendiente || 0;

      if (data.pagado) {
        nuevoSaldo = Math.max(0, nuevoSaldo - totalCalculado);
      } else {
        nuevoSaldo = nuevoSaldo + totalCalculado;
      }

      const batch = writeBatch(db);
      const entregaCollectionPath = `tenants/${userTenantId}/entregas`;
      const entregaRef = doc(collection(db, entregaCollectionPath));

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


      // Actualizar stock de productos individuales
      // Verificar que los productos existan antes de actualizar
      const stockUpdates = productosEntregados.map(async (producto) => {
        const productoData = productos.find(p => p.id === producto.productoId);
        if (!productoData) return null;
        
        const nuevoStock = (productoData.stock || 0) - producto.cantidad;
        
        // Verificar si el producto existe en la colección del tenant
        const tenantProductoRef = doc(db, `tenants/${userTenantId}/productos`, producto.productoId);
        
        try {
          const productoDoc = await getDoc(tenantProductoRef);
          
          if (productoDoc.exists()) {
            // El producto existe, actualizar el stock
            return {
              ref: tenantProductoRef,
              data: {
                stock: nuevoStock,
                updatedAt: serverTimestamp()
              }
            };
          } else {
            // El producto no existe, crear un log de advertencia
            console.warn(`Producto ${producto.productoId} no existe en la colección del tenant. Saltando actualización de stock.`);
            return null;
          }
        } catch (error) {
          console.warn(`Error al verificar producto ${producto.productoId}:`, error);
          return null;
        }
      });

      // Esperar a que se resuelvan todas las verificaciones
      const stockUpdateResults = await Promise.all(stockUpdates);
      
      // Agregar solo las actualizaciones válidas al batch
      stockUpdateResults.forEach(update => {
        if (update) {
          batch.update(update.ref, update.data);
        }
      });

      await batch.commit();
      
      // Guardar datos de la entrega para mostrar en el modal de confirmación
      const entregaCompleta = {
        clienteId: data.clienteId,
        productos: productosEntregados,
        envasesDevueltos: data.envasesDevueltos,
        total: totalCalculado,
        pagado: data.pagado,
        medioPago: data.medioPago,
        observaciones: data.observaciones,
        cliente: clienteData as Cliente,
        nuevoSaldo: nuevoSaldo,
        fechaRegistro: now
      };
      
      setEntregaRegistrada(entregaCompleta);
      setShowConfirmacionEntrega(true);
      toast.success('Entrega registrada correctamente');
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
                if (productos.length > 0) {
                  // Sugerir cantidades basadas en el stock disponible (máximo 50% del stock)
                  productos.forEach(producto => {
                    const fieldName = `producto_${producto.id}`;
                    const sugerencia = Math.floor((producto.stock || 0) * 0.5);
                    setValue(fieldName as string, sugerencia);
                  });
                  
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
                  type="button"
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
                {/* Productos dinámicos */}
                {productos.map((producto) => {
                  const fieldName = `producto_${producto.id}` as keyof EntregaFormData;
                  const stockDisponible = producto.stock || 0;
                  const cantidadSolicitada = allValues[fieldName] as number || 0;
                  const excedeStock = cantidadSolicitada > stockDisponible;
                  
                  return (
                    <div key={producto.id} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        <Package className="inline h-4 w-4 mr-2" />
                        {producto.nombre} 
                        <span className="text-gray-500 text-xs sm:text-sm">(${producto.precioVenta} c/u)</span>
                      </label>
                      <div className="space-y-1">
                        <input
                          {...register(fieldName as string, { valueAsNumber: true })}
                          type="number"
                          min="0"
                          max={stockDisponible}
                          className={`w-full px-3 py-2 text-base sm:text-sm border rounded-lg focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                            excedeStock 
                              ? 'border-red-300 focus:ring-red-500 bg-red-50 dark:bg-red-900/20' 
                              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                          }`}
                        />
                        <div className={`text-xs text-right ${
                          excedeStock ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          Stock disponible: {stockDisponible}
                        </div>
                      </div>
                      
                      {/* Alertas de stock */}
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
                      
                      {!excedeStock && stockDisponible < 5 && stockDisponible > 0 && (
                        <div className="flex items-center space-x-1 text-xs text-orange-600 dark:text-orange-400">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Stock muy bajo</span>
                        </div>
                      )}
                      
                      {errors[fieldName] && (
                        <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                          {(errors[fieldName] as { message?: string })?.message}
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Campo para envases devueltos (siempre presente) */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Package className="inline h-4 w-4 mr-2" />
                    Envases Devueltos
                  </label>
                  <div className="relative">
                    <input
                      {...register('envasesDevueltos', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 text-base sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  {errors.envasesDevueltos && (
                    <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                      {errors.envasesDevueltos?.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Calculadora visual mejorada */}
              {showCalculator && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3 flex items-center">
                    <Calculator className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                    Desglose de Precios
                  </h4>
                  <div className="space-y-3 text-sm">
                    {/* Productos dinámicos */}
                    {productos.map((producto) => {
                      const fieldName = `producto_${producto.id}` as keyof EntregaFormData;
                      const cantidad = allValues[fieldName] as number || 0;
                      const subtotal = cantidad * producto.precioVenta;
                      
                      if (cantidad === 0) return null;
                      
                      return (
                        <div key={producto.id} className="flex justify-between items-center py-1">
                          <span className="text-gray-600 dark:text-gray-300">
                            {producto.nombre}: {cantidad} × ${producto.precioVenta}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            ${subtotal.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                    
                    <div className="border-t border-gray-300 dark:border-gray-500 pt-3 flex justify-between items-center font-semibold text-base">
                      <span className="text-gray-700 dark:text-gray-200">Total:</span>
                      <span className="text-green-600 dark:text-green-400 font-bold">
                        ${totalCalculado.toFixed(2)}
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
                    ${totalCalculado.toFixed(2)}
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
                        Se agregará ${totalCalculado.toFixed(2)} al saldo pendiente del cliente
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                      Nuevo saldo: ${(((clienteSeleccionado?.saldoPendiente || 0) + totalCalculado).toFixed(2))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Estado del Cliente */}
            {clienteSeleccionado && (() => {
              const estadoCliente = obtenerEstadoCliente();
              if (!estadoCliente) return null;

              const getColorClasses = (color: string) => {
                switch (color) {
                  case 'red':
                    return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
                  case 'orange':
                    return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
                  case 'yellow':
                    return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
                  case 'gray':
                    return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
                  default:
                    return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
                }
              };

              const getTextColorClasses = (color: string) => {
                switch (color) {
                  case 'red':
                    return 'text-red-800 dark:text-red-200';
                  case 'orange':
                    return 'text-orange-800 dark:text-orange-200';
                  case 'yellow':
                    return 'text-yellow-800 dark:text-yellow-200';
                  case 'gray':
                    return 'text-gray-800 dark:text-gray-200';
                  default:
                    return 'text-green-800 dark:text-green-200';
                }
              };

              return (
                <div className={`rounded-lg border p-4 ${getColorClasses(estadoCliente.color)}`}>
                  <h4 className="font-medium mb-3 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    <span className={getTextColorClasses(estadoCliente.color)}>
                      Estado del Cliente
                    </span>
                  </h4>
                  
                  <div className="space-y-3">
                    {/* Estado principal */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{estadoCliente.icono}</span>
                        <span className={`font-medium ${getTextColorClasses(estadoCliente.color)}`}>
                          {estadoCliente.mensaje}
                        </span>
                      </div>
                      {estadoCliente.saldoPendiente > 0 && (
                        <span className={`font-bold ${getTextColorClasses(estadoCliente.color)}`}>
                          ${estadoCliente.saldoPendiente.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Información adicional */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className={`font-medium ${getTextColorClasses(estadoCliente.color)}`}>
                          Saldo actual:
                        </span>
                        <span className={`ml-2 ${getTextColorClasses(estadoCliente.color)}`}>
                          ${estadoCliente.saldoPendiente.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className={`font-medium ${getTextColorClasses(estadoCliente.color)}`}>
                          Última entrega:
                        </span>
                        <span className={`ml-2 ${getTextColorClasses(estadoCliente.color)}`}>
                          {estadoCliente.diasVencimiento === 0 
                            ? 'Hoy' 
                            : `${estadoCliente.diasVencimiento} días`
                          }
                        </span>
                      </div>
                    </div>

                    {/* Advertencias específicas */}
                    {estadoCliente.estado === 'vencido' && (
                      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                          ⚠️ Cliente con deuda vencida. Considera solicitar pago antes de entregar.
                        </p>
                      </div>
                    )}
                    {estadoCliente.estado === 'atrasado' && (
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded border border-orange-200 dark:border-orange-800">
                        <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
                          ⚠️ Cliente con deuda atrasada. Recuerda cobrar pendientes.
                        </p>
                      </div>
                    )}
                    {estadoCliente.estado === 'inactivo' && (
                      <div className="p-2 bg-gray-100 dark:bg-gray-900/30 rounded border border-gray-200 dark:border-gray-800">
                        <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                          ℹ️ Cliente inactivo. Verifica si sigue siendo cliente activo.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
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
                    {/* Productos dinámicos */}
                    {productos.map((producto) => {
                      const fieldName = `producto_${producto.id}`;
                      const cantidad = (allValues[fieldName] as number) || 0;
                      
                      if (cantidad > 0) {
                        return (
                          <p key={producto.id} className="text-sm text-gray-700 dark:text-gray-300">
                            <span className="font-medium text-gray-900 dark:text-white">{cantidad}</span> {producto.nombre}
                          </p>
                        );
                      }
                      return null;
                    })}
                    
                    {/* Envases devueltos */}
                    {allValues.envasesDevueltos > 0 && (
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium text-gray-900 dark:text-white">{allValues.envasesDevueltos}</span> Envases Devueltos
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pago</h4>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">${totalCalculado.toFixed(2)}</p>
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
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6"> {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
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
                type="button"
                disabled={loading || !formIsValid}
                onClick={async () => {
                  // Forzar validación del formulario
                  const isValid = await trigger();
                  
                  if (!isValid) {
                    return;
                  }
                  
                  // Obtener los datos del formulario y ejecutar onSubmit manualmente
                  const formData = watch();
                  await onSubmit(formData);
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

      {/* Modal de confirmación de entrega */}
      {showConfirmacionEntrega && entregaRegistrada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header del modal */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      ¡Entrega Registrada Exitosamente!
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Revisa los detalles antes de finalizar
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleFinalizarEntrega}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Detalles de la entrega */}
              <div className="space-y-6">
                {/* Información del cliente */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Información del Cliente
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-blue-700 dark:text-blue-300 font-medium">Cliente:</span>
                      <span className="ml-2 text-blue-900 dark:text-blue-100">{entregaRegistrada.cliente?.nombre}</span>
                    </div>
                    <div>
                      <span className="text-blue-700 dark:text-blue-300 font-medium">Teléfono:</span>
                      <span className="ml-2 text-blue-900 dark:text-blue-100">{entregaRegistrada.cliente?.telefono || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-blue-700 dark:text-blue-300 font-medium">Dirección:</span>
                      <span className="ml-2 text-blue-900 dark:text-blue-100">{entregaRegistrada.cliente?.direccion || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-blue-700 dark:text-blue-300 font-medium">Zona:</span>
                      <span className="ml-2 text-blue-900 dark:text-blue-100">{entregaRegistrada.cliente?.zona || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Estado Financiero del Cliente */}
                {entregaRegistrada.cliente && (() => {
                  const estadoCliente = obtenerEstadoCliente();
                  if (!estadoCliente) return null;

                  const getColorClasses = (color: string) => {
                    switch (color) {
                      case 'red':
                        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
                      case 'orange':
                        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
                      case 'yellow':
                        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
                      case 'gray':
                        return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
                      default:
                        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
                    }
                  };

                  const getTextColorClasses = (color: string) => {
                    switch (color) {
                      case 'red':
                        return 'text-red-800 dark:text-red-200';
                      case 'orange':
                        return 'text-orange-800 dark:text-orange-200';
                      case 'yellow':
                        return 'text-yellow-800 dark:text-yellow-200';
                      case 'gray':
                        return 'text-gray-800 dark:text-gray-200';
                      default:
                        return 'text-green-800 dark:text-green-200';
                    }
                  };

                  return (
                    <div className={`rounded-lg border p-4 ${getColorClasses(estadoCliente.color)}`}>
                      <h4 className="font-medium mb-3 flex items-center">
                        <DollarSign className="h-4 w-4 mr-2" />
                        <span className={getTextColorClasses(estadoCliente.color)}>
                          Estado Financiero del Cliente
                        </span>
                      </h4>
                      
                      <div className="space-y-3">
                        {/* Estado principal */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{estadoCliente.icono}</span>
                            <span className={`font-medium ${getTextColorClasses(estadoCliente.color)}`}>
                              {estadoCliente.mensaje}
                            </span>
                          </div>
                          {estadoCliente.saldoPendiente > 0 && (
                            <span className={`font-bold ${getTextColorClasses(estadoCliente.color)}`}>
                              ${estadoCliente.saldoPendiente.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Información detallada */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className={`font-medium ${getTextColorClasses(estadoCliente.color)}`}>
                              Saldo anterior:
                            </span>
                            <span className={`ml-2 ${getTextColorClasses(estadoCliente.color)}`}>
                              ${estadoCliente.saldoPendiente.toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className={`font-medium ${getTextColorClasses(estadoCliente.color)}`}>
                              Última entrega:
                            </span>
                            <span className={`ml-2 ${getTextColorClasses(estadoCliente.color)}`}>
                              {estadoCliente.diasVencimiento === 0 
                                ? 'Hoy' 
                                : `${estadoCliente.diasVencimiento} días`
                              }
                            </span>
                          </div>
                          <div>
                            <span className={`font-medium ${getTextColorClasses(estadoCliente.color)}`}>
                              Nuevo saldo:
                            </span>
                            <span className={`ml-2 font-bold ${getTextColorClasses(estadoCliente.color)}`}>
                              ${entregaRegistrada.nuevoSaldo.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Resumen de cambio */}
                        <div className="p-3 bg-white/50 dark:bg-black/20 rounded border">
                          <div className="flex items-center justify-between text-sm">
                            <span className={`font-medium ${getTextColorClasses(estadoCliente.color)}`}>
                              Cambio en saldo:
                            </span>
                            <span className={`font-bold ${
                              entregaRegistrada.nuevoSaldo > estadoCliente.saldoPendiente 
                                ? 'text-red-600 dark:text-red-400' 
                                : 'text-green-600 dark:text-green-400'
                            }`}>
                              {entregaRegistrada.nuevoSaldo > estadoCliente.saldoPendiente ? '+' : ''}
                              ${(entregaRegistrada.nuevoSaldo - estadoCliente.saldoPendiente).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Productos entregados */}
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 dark:text-green-100 mb-3 flex items-center">
                    <Package className="h-4 w-4 mr-2" />
                    Productos Entregados
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    {/* Productos dinámicos */}
                    {entregaRegistrada.productos?.map((producto) => (
                      <div key={producto.productoId} className="text-center">
                        <div className="text-lg font-bold text-green-700 dark:text-green-300">{producto.cantidad}</div>
                        <div className="text-green-600 dark:text-green-400">{producto.nombre}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">${producto.subtotal.toFixed(2)}</div>
                      </div>
                    ))}
                    
                    {/* Envases devueltos */}
                    {entregaRegistrada.envasesDevueltos > 0 && (
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-700 dark:text-green-300">{entregaRegistrada.envasesDevueltos}</div>
                        <div className="text-green-600 dark:text-green-400">Envases Devueltos</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Información de pago */}
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-3 flex items-center">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Información de Pago
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-purple-700 dark:text-purple-300 font-medium">Total:</span>
                      <span className="ml-2 text-lg font-bold text-purple-900 dark:text-purple-100">${entregaRegistrada.total}</span>
                    </div>
                    <div>
                      <span className="text-purple-700 dark:text-purple-300 font-medium">Estado:</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        entregaRegistrada.pagado 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                          : 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
                      }`}>
                        {entregaRegistrada.pagado ? 'Pagado' : 'Pendiente'}
                      </span>
                    </div>
                    {entregaRegistrada.pagado && entregaRegistrada.medioPago && (
                      <div>
                        <span className="text-purple-700 dark:text-purple-300 font-medium">Método:</span>
                        <span className="ml-2 text-purple-900 dark:text-purple-100 capitalize">{entregaRegistrada.medioPago}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-purple-700 dark:text-purple-300 font-medium">Nuevo Saldo:</span>
                      <span className={`ml-2 font-bold ${
                        entregaRegistrada.nuevoSaldo > 0 
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        ${entregaRegistrada.nuevoSaldo}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Observaciones */}
                {entregaRegistrada.observaciones && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Observaciones
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{entregaRegistrada.observaciones}</p>
                  </div>
                )}

                {/* Fecha y hora */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Fecha: {entregaRegistrada.fechaRegistro.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>Hora: {entregaRegistrada.fechaRegistro.toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={handleNuevaEntrega}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Entrega
                </button>
                <button
                  onClick={handleFinalizarEntrega}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Finalizar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};