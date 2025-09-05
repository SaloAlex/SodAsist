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
    tipoPago: yup.string().oneOf(['no_pagado', 'pagado_completo', 'pago_parcial'] as const, 'Tipo de pago inválido').required('Tipo de pago requerido'),
    montoPagado: yup.number().when('tipoPago', {
      is: 'pago_parcial',
      then: (schema) => schema
        .transform((_value, originalValue) => {
          if (originalValue === '' || originalValue === null || originalValue === undefined) {
            return undefined; // Dejar como undefined para que falle la validación required
          }
          const num = Number(originalValue);
          return isNaN(num) ? undefined : num;
        })
        .min(0.01, 'Monto debe ser mayor a 0')
        .required('Monto requerido para pago parcial'),
      otherwise: (schema) => schema.nullable(),
    }),
    medioPago: yup.string().when('tipoPago', {
      is: (val: string) => val === 'pagado_completo' || val === 'pago_parcial',
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
  tipoPago: 'no_pagado' | 'pagado_completo' | 'pago_parcial';
  montoPagado?: number;
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
  const [inventarioVehiculo, setInventarioVehiculo] = useState<Record<string, number>>({});
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
  const [validationMessage, setValidationMessage] = useState<string>('');
  const [entregaRegistrada, setEntregaRegistrada] = useState<{
    clienteId: string;
    productos: { productoId: string; cantidad: number; precio: number; nombre: string; subtotal: number }[];
    envasesDevueltos: number;
    total: number;
    pagado: boolean;
    montoPagado?: number;
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
    getValues,
  } = useForm<EntregaFormData>({
    resolver: yupResolver(createSchema(productos)) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: {
      sodas: 0,
      bidones10: 0,
      bidones20: 0,
      envasesDevueltos: 0,
      total: 0,
      pagado: false,
      tipoPago: 'no_pagado',
      montoPagado: undefined,
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
      const precio = producto.precioVenta || 0;
      
      // Validar que tanto cantidad como precio sean números válidos
      if (!isNaN(cantidad) && !isNaN(precio) && cantidad >= 0 && precio >= 0) {
        total += cantidad * precio;
      }
    });
    
    // Asegurar que el total sea un número válido
    return isNaN(total) ? 0 : total;
  }, [productos, allValues]);

  // Función auxiliar para manejar valores NaN
  const safeNumber = (value: number | undefined | null): number => {
    if (value === null || value === undefined || isNaN(value)) {
      return 0;
    }
    return value;
  };

  // No actualizar el campo total automáticamente para evitar bucles infinitos
  // El total se calcula dinámicamente y se usa directamente en la UI

  // Revalidar formulario cuando cambien los productos
  useEffect(() => {
    if (productos.length > 0) {
      trigger(); // Revalidar todos los campos
    }
  }, [productos, trigger]);

  // Limpiar montoPagado cuando cambie el tipo de pago
  useEffect(() => {
    if (allValues.tipoPago !== 'pago_parcial') {
      setValue('montoPagado', 0);
    } else if (allValues.tipoPago === 'pago_parcial' && allValues.montoPagado === 0) {
      setValue('montoPagado', undefined);
    }
  }, [allValues.tipoPago, allValues.montoPagado, setValue]);

  // Limpiar mensaje de validación cuando cambien los valores del formulario
  // PERO solo si el mensaje ya se mostró por un tiempo
  useEffect(() => {
    if (validationMessage) {
      const timer = setTimeout(() => {
        setValidationMessage('');
      }, 5000); // Limpiar después de 5 segundos
      
      return () => clearTimeout(timer);
    }
  }, [validationMessage]);

  // Limpiar mensaje de validación cuando se corrijan los errores
  useEffect(() => {
    if (validationMessage) {
      const values = getValues();
      
      // Verificar si se corrigieron los errores
      let errorCorregido = false;
      
      if (currentStep === 1 && values.clienteId) {
        errorCorregido = true;
      } else if (currentStep === 2) {
        const tieneProductos = productos.some(producto => {
          const fieldName = `producto_${producto.id}`;
          const cantidad = values[fieldName] as number || 0;
          return cantidad > 0;
        });
        if (tieneProductos) {
          errorCorregido = true;
        }
      } else if (currentStep === 3) {
        if (values.tipoPago) {
          if (values.tipoPago === 'no_pagado') {
            errorCorregido = true;
          } else if (values.tipoPago === 'pagado_completo' && values.medioPago) {
            errorCorregido = true;
          } else if (values.tipoPago === 'pago_parcial' && values.montoPagado && values.montoPagado > 0 && values.medioPago) {
            errorCorregido = true;
          }
        }
      }
      
      if (errorCorregido) {
        setValidationMessage('');
      }
    }
  }, [allValues, currentStep, validationMessage, productos, getValues]);

  // Cargar datos iniciales
  useEffect(() => {
    loadClientes();
    loadProductos();
    loadInventarioVehiculo();
  }, []);

  // Recargar productos e inventario cuando el usuario regresa a la página
  useEffect(() => {
    const handleFocus = () => {
      loadProductos();
      loadInventarioVehiculo();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadProductos();
        loadInventarioVehiculo();
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
      // Filtrar productos duplicados - agrupar por nombre y tomar el que tenga mayor stock
      const productosUnicos = productosData.reduce((acc, producto) => {
        const nombreNormalizado = producto.nombre.toLowerCase().trim();
        
        if (!acc[nombreNormalizado]) {
          acc[nombreNormalizado] = producto;
        } else {
          // Si ya existe, tomar el que tenga mayor stock
          if (producto.stock > acc[nombreNormalizado].stock) {
            acc[nombreNormalizado] = producto;
          }
        }
        
        return acc;
      }, {} as Record<string, Producto>);
      
      const productosFiltrados = Object.values(productosUnicos);
      
      setProductos(productosFiltrados);
    } catch (err) {
      console.error('Error al cargar productos:', err);
      toast.error('Error al cargar productos');
      setProductos([]);
    }
  };

  const loadInventarioVehiculo = async () => {
    try {
      const inventario = await FirebaseService.getInventarioActualDinamico();
      if (inventario) {
        setInventarioVehiculo(inventario);
      } else {
        setInventarioVehiculo({});
      }
    } catch (err) {
      console.error('Error al cargar inventario del vehículo:', err);
      setInventarioVehiculo({});
    }
  };

  // Función para obtener el stock del vehículo basado en el ID del producto
  const getStockVehiculo = (productoId: string): number => {
    return inventarioVehiculo[productoId] || 0;
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

  const validarInventario = (): boolean => {
    if (!productos || productos.length === 0) {
      toast('Productos no disponibles. La entrega se registrará sin validación de stock.', { 
        icon: '⚠️',
        duration: 5000
      });
      return true; // Permitir la entrega temporalmente
    }

    // Por ahora, permitir todas las entregas sin validación estricta
    // La validación se puede implementar más tarde cuando se tenga
    // un sistema más robusto de inventario del vehículo
    return true;
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
    // Limpiar mensaje anterior
    setValidationMessage('');
    
    const currentStepData = steps.find(s => s.id === currentStep);
    if (currentStepData) {
      const isStepValid = await trigger(currentStepData.fields as string[]);
      if (isStepValid) {
        setCurrentStep(prev => Math.min(prev + 1, steps.length));
      } else {
        // Mostrar mensaje específico según el paso actual
        if (currentStep === 1) {
          setValidationMessage('Por favor selecciona un cliente para continuar');
        } else if (currentStep === 2) {
          setValidationMessage('Por favor ingresa al menos un producto para continuar');
        } else if (currentStep === 3) {
          // Validación específica para el paso de pago
          const values = getValues();
          if (!values.tipoPago) {
            setValidationMessage('Por favor selecciona una opción de pago');
          } else if (values.tipoPago === 'pago_parcial' && (!values.montoPagado || values.montoPagado <= 0)) {
            setValidationMessage('Por favor ingresa un monto válido para el pago parcial');
          } else if ((values.tipoPago === 'pagado_completo' || values.tipoPago === 'pago_parcial') && !values.medioPago) {
            setValidationMessage('Por favor selecciona un medio de pago');
          }
        }
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
    if (!validarInventario()) {
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
      let montoPagado = 0;

      // Calcular el nuevo saldo basado en el tipo de pago
      // IMPORTANTE: Siempre se suma la nueva compra al saldo pendiente
      const saldoAnterior = safeNumber(clienteData?.saldoPendiente);
      const totalCalculadoValido = safeNumber(totalCalculado);
      const totalConDeuda = saldoAnterior + totalCalculadoValido;
      
      switch (data.tipoPago) {
        case 'no_pagado':
          // No se paga nada, se suma toda la compra a la deuda
          nuevoSaldo = totalConDeuda;
          montoPagado = 0;
          break;
        case 'pagado_completo':
          // Se paga todo (deuda anterior + nueva compra)
          nuevoSaldo = 0;
          montoPagado = totalConDeuda;
          break;
        case 'pago_parcial':
          // Se paga un monto parcial, se resta del total (deuda + nueva compra)
          montoPagado = data.montoPagado || 0;
          nuevoSaldo = Math.max(0, totalConDeuda - montoPagado);
          break;
      }

      const entregaData: Omit<Entrega, 'id'> = {
        clienteId: data.clienteId,
        productos: productosEntregados,
        envasesDevueltos: data.envasesDevueltos,
        total: totalCalculado,
        pagado: data.tipoPago !== 'no_pagado',
        tipoPago: data.tipoPago,
        montoPagado: montoPagado,
        fecha: now,
        createdAt: now,
        ...(data.observaciones && data.observaciones.trim() && { observaciones: data.observaciones }),
        ...((data.tipoPago === 'pagado_completo' || data.tipoPago === 'pago_parcial') && data.medioPago && { medioPago: data.medioPago as 'efectivo' | 'transferencia' | 'tarjeta' })
      };

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


      // NOTA: La actualización del inventario del vehículo se maneja automáticamente
      // por el trigger onEntregaCreate en Firebase Functions para evitar doble descuento

      await batch.commit();

      // Guardar datos de la entrega para mostrar en el modal de confirmación
      const entregaCompleta = {
        clienteId: data.clienteId,
        productos: productosEntregados,
        envasesDevueltos: data.envasesDevueltos,
        total: totalCalculado,
        pagado: data.pagado,
        montoPagado: montoPagado,
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
                  // Sugerir cantidades basadas en el stock del vehículo (máximo 50% del stock)
                  productos.forEach(producto => {
                    const fieldName = `producto_${producto.id}`;
                    const stockVehiculo = getStockVehiculo(producto.id);
                    const sugerencia = Math.floor(stockVehiculo * 0.5);
                    setValue(fieldName as string, sugerencia);
                  });
                  
                  toast.success('Cantidades sugeridas basadas en stock del vehículo');
                }
              }}
              className="flex items-center px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-colors"
              title="Sugerir cantidades basadas en stock del vehículo"
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
                  const stockDisponible = getStockVehiculo(producto.id);
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

              {/* Alerta específica para el paso de pago */}
              {validationMessage && currentStep === 3 && (
                <div className="mb-6 p-4 bg-gradient-to-r from-amber-400 to-orange-500 dark:from-amber-500 dark:to-orange-600 border-2 border-amber-300 dark:border-amber-400 rounded-xl shadow-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center w-10 h-10 bg-white dark:bg-amber-100 rounded-full">
                        <svg className="h-6 w-6 text-amber-600 dark:text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <h4 className="text-lg font-bold text-white dark:text-amber-100 mb-1">
                        💳 INFORMACIÓN DE PAGO INCOMPLETA
                      </h4>
                      <p className="text-base font-semibold text-white dark:text-amber-100">
                        {validationMessage}
                      </p>
                      <p className="text-sm text-amber-100 dark:text-amber-200 mt-1">
                        Selecciona una opción de pago y completa los campos requeridos.
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-4 h-4 bg-white dark:bg-amber-200 rounded-full animate-ping"></div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Total a Cobrar
                  </label>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    ${totalCalculado.toFixed(2)}
                  </div>
                </div>

                {/* Opciones de pago */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    <DollarSign className="inline h-4 w-4 mr-2" />
                    Opciones de Pago
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { 
                        value: 'no_pagado', 
                        label: 'No pagado', 
                        description: 'Se suma al saldo pendiente',
                        color: 'red'
                      },
                      { 
                        value: 'pagado_completo', 
                        label: 'Pagado completo', 
                        description: 'Se descuenta del saldo pendiente',
                        color: 'green'
                      },
                      { 
                        value: 'pago_parcial', 
                        label: 'Pago parcial', 
                        description: 'Ingresa el monto que está pagando',
                        color: 'blue'
                      }
                    ].map(({ value, label, description, color }) => (
                      <label key={value} className="relative">
                  <input
                          {...register('tipoPago')}
                          type="radio"
                          value={value}
                          className="sr-only peer"
                        />
                        <div className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-300 ${
                          validationMessage && currentStep === 3 && !allValues.tipoPago
                            ? 'border-red-400 bg-red-50 dark:bg-red-900/20 animate-pulse shadow-lg'
                            : color === 'red' ? 'border-gray-200 dark:border-gray-600 hover:border-red-300 peer-checked:border-red-500 peer-checked:bg-red-50 dark:peer-checked:bg-red-900/20' :
                            color === 'green' ? 'border-gray-200 dark:border-gray-600 hover:border-green-300 peer-checked:border-green-500 peer-checked:bg-green-50 dark:peer-checked:bg-green-900/20' :
                            'border-gray-200 dark:border-gray-600 hover:border-blue-300 peer-checked:border-blue-500 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/20'
                        }`}>
                          <div className="flex-1">
                            <div className={`font-medium ${
                              color === 'red' ? 'text-red-700 dark:text-red-300' :
                              color === 'green' ? 'text-green-700 dark:text-green-300' :
                              'text-blue-700 dark:text-blue-300'
                            }`}>
                              {label}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {description}
                            </div>
                          </div>
                        </div>
                  </label>
                    ))}
                  </div>
                  {errors.tipoPago && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.tipoPago.message}</p>
                  )}
                </div>

                {/* Campo para monto pagado (solo para pago parcial) */}
                {allValues.tipoPago === 'pago_parcial' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      <DollarSign className="inline h-4 w-4 mr-2" />
                      Monto que está pagando
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <input
                        {...register('montoPagado', { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={totalCalculado + (clienteSeleccionado?.saldoPendiente || 0)}
                        className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-300 ${
                          validationMessage && currentStep === 3 && allValues.tipoPago === 'pago_parcial' && (!allValues.montoPagado || allValues.montoPagado <= 0)
                            ? 'border-red-400 bg-red-50 dark:bg-red-900/20 focus:ring-red-500 animate-pulse shadow-lg'
                            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                        }`}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Máximo: ${(totalCalculado + (clienteSeleccionado?.saldoPendiente || 0)).toFixed(2)} (total + deuda pendiente)
                    </div>
                    {errors.montoPagado && (
                      <p className="text-sm text-red-600 dark:text-red-400">{errors.montoPagado.message}</p>
                    )}
                  </div>
                )}

                {/* Medio de pago (solo para pagos) */}
                {(allValues.tipoPago === 'pagado_completo' || allValues.tipoPago === 'pago_parcial') && (
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
                          <div className={`flex flex-col sm:flex-row sm:items-center items-center p-3 border-2 rounded-lg cursor-pointer transition-all duration-300 ${
                            validationMessage && currentStep === 3 && (allValues.tipoPago === 'pagado_completo' || allValues.tipoPago === 'pago_parcial') && !allValues.medioPago
                              ? 'border-red-400 bg-red-50 dark:bg-red-900/20 animate-pulse shadow-lg'
                              : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 peer-checked:border-blue-500 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/20'
                          }`}>
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

                {/* Resumen del saldo */}
                {clienteSeleccionado && (
                  <div className={`p-3 rounded-lg ${
                    allValues.tipoPago === 'no_pagado' 
                      ? 'bg-amber-50 dark:bg-amber-900/20' 
                      : allValues.tipoPago === 'pagado_completo'
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : 'bg-blue-50 dark:bg-blue-900/20'
                  }`}>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Saldo actual:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          ${safeNumber(clienteSeleccionado?.saldoPendiente).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Entrega actual:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          ${safeNumber(totalCalculado).toFixed(2)}
                        </span>
                      </div>
                      {allValues.tipoPago === 'pago_parcial' && allValues.montoPagado && !isNaN(allValues.montoPagado as number) && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Monto pagado:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">-${Number(allValues.montoPagado).toFixed(2)}</span>
                        </div>
                      )}
                      {allValues.tipoPago === 'pagado_completo' && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Monto pagado:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            -${(safeNumber(totalCalculado) + safeNumber(clienteSeleccionado?.saldoPendiente)).toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="border-t border-gray-300 dark:border-gray-500 pt-2 flex justify-between font-semibold">
                        <span className="text-gray-900 dark:text-gray-100">Nuevo saldo:</span>
                        <span className={`${
                          (() => {
                            const saldoAnterior = safeNumber(clienteSeleccionado?.saldoPendiente);
                            const totalCalculadoValido = safeNumber(totalCalculado);
                            const totalConDeuda = saldoAnterior + totalCalculadoValido;
                            let nuevoSaldo = 0;
                            
                            if (allValues.tipoPago === 'no_pagado') {
                              nuevoSaldo = totalConDeuda;
                            } else if (allValues.tipoPago === 'pagado_completo') {
                              nuevoSaldo = 0;
                            } else if (allValues.tipoPago === 'pago_parcial' && allValues.montoPagado && !isNaN(allValues.montoPagado as number)) {
                              const montoPagadoValido = Number(allValues.montoPagado);
                              nuevoSaldo = Math.max(0, totalConDeuda - montoPagadoValido);
                            }
                            return nuevoSaldo;
                          })() > 0 
                            ? 'text-orange-600 dark:text-orange-400' 
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          ${(() => {
                            const saldoAnterior = safeNumber(clienteSeleccionado?.saldoPendiente);
                            const totalCalculadoValido = safeNumber(totalCalculado);
                            const totalConDeuda = saldoAnterior + totalCalculadoValido;
                            let nuevoSaldo = 0;
                            
                            if (allValues.tipoPago === 'no_pagado') {
                              nuevoSaldo = totalConDeuda;
                            } else if (allValues.tipoPago === 'pagado_completo') {
                              nuevoSaldo = 0;
                            } else if (allValues.tipoPago === 'pago_parcial' && allValues.montoPagado && !isNaN(allValues.montoPagado as number)) {
                              const montoPagadoValido = Number(allValues.montoPagado);
                              nuevoSaldo = Math.max(0, totalConDeuda - montoPagadoValido);
                            }
                            return isNaN(nuevoSaldo) ? 0 : nuevoSaldo.toFixed(2);
                          })()}
                        </span>
                      </div>
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
                    {(() => {
                      const saldoAnterior = safeNumber(clienteSeleccionado?.saldoPendiente);
                      const totalCalculadoValido = safeNumber(totalCalculado);
                      const totalConDeuda = saldoAnterior + totalCalculadoValido;
                      let montoMostrar = 0;
                      let estadoPago = '';
                      let colorClase = '';

                      if (allValues.tipoPago === 'no_pagado') {
                        montoMostrar = totalConDeuda;
                        estadoPago = 'Pendiente de pago';
                        colorClase = 'text-red-600 dark:text-red-400';
                      } else if (allValues.tipoPago === 'pagado_completo') {
                        montoMostrar = totalConDeuda;
                        estadoPago = `Pagado completo - ${allValues.medioPago}`;
                        colorClase = 'text-green-600 dark:text-green-400';
                      } else if (allValues.tipoPago === 'pago_parcial') {
                        const montoPagado = safeNumber(allValues.montoPagado);
                        montoMostrar = Math.max(0, totalConDeuda - montoPagado);
                        estadoPago = `Pago parcial - ${allValues.medioPago}`;
                        colorClase = montoMostrar > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400';
                      }

                      return (
                        <>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            ${montoMostrar.toFixed(2)}
                          </p>
                          <p className={`text-sm ${colorClase}`}>
                            {estadoPago}
                          </p>
                          {allValues.tipoPago === 'pago_parcial' && montoMostrar > 0 && (
                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                              Saldo pendiente: ${montoMostrar.toFixed(2)}
                            </p>
                          )}
                        </>
                      );
                    })()}
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

        {/* Mensaje de validación - MUY NOTORIO */}
        {validationMessage && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 border-2 border-red-400 dark:border-red-500 rounded-xl shadow-lg animate-pulse">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-8 h-8 bg-white dark:bg-red-100 rounded-full animate-bounce">
                  <svg className="h-5 w-5 text-red-600 dark:text-red-700" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-bold text-white dark:text-red-100 mb-1">
                  ⚠️ ATENCIÓN REQUERIDA
                </h3>
                <p className="text-base font-semibold text-white dark:text-red-100">
                  {validationMessage}
                </p>
                <p className="text-sm text-red-100 dark:text-red-200 mt-1">
                  Por favor, completa la información requerida antes de continuar.
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-white dark:bg-red-200 rounded-full animate-ping"></div>
              </div>
            </div>
          </div>
        )}

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
                className={`flex items-center justify-center px-6 py-3 rounded-lg transition-all duration-300 w-full sm:w-auto font-semibold ${
                  validationMessage 
                    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg animate-pulse border-2 border-red-400' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {validationMessage ? (
                  <>
                    ⚠️ COMPLETAR PASO
                    <ArrowRight className="h-4 w-4 ml-2 animate-bounce" />
                  </>
                ) : (
                  <>
                Siguiente
                <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
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
                              entregaRegistrada.nuevoSaldo < estadoCliente.saldoPendiente 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {entregaRegistrada.nuevoSaldo < estadoCliente.saldoPendiente ? '-' : '+'}
                              ${Math.abs(entregaRegistrada.nuevoSaldo - estadoCliente.saldoPendiente).toFixed(2)}
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
                  <div className="space-y-3 text-sm">
                    {/* Nueva compra */}
                    <div className="flex justify-between items-center">
                      <span className="text-purple-700 dark:text-purple-300 font-medium">Nueva compra:</span>
                      <span className="text-lg font-bold text-purple-900 dark:text-purple-100">${entregaRegistrada.total.toFixed(2)}</span>
                    </div>
                    
                    {/* Estado del pago */}
                    <div className="flex justify-between items-center">
                      <span className="text-purple-700 dark:text-purple-300 font-medium">Estado:</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        entregaRegistrada.pagado 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                          : 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
                      }`}>
                        {entregaRegistrada.pagado ? 'Pagado' : 'Pendiente'}
                      </span>
                    </div>
                    
                    {/* Método de pago si aplica */}
                    {entregaRegistrada.pagado && entregaRegistrada.medioPago && (
                      <div className="flex justify-between items-center">
                        <span className="text-purple-700 dark:text-purple-300 font-medium">Método:</span>
                        <span className="text-purple-900 dark:text-purple-100 capitalize font-medium">{entregaRegistrada.medioPago}</span>
                      </div>
                    )}
                    
                    {/* Monto pagado si aplica */}
                    {entregaRegistrada.pagado && entregaRegistrada.montoPagado && entregaRegistrada.montoPagado > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-purple-700 dark:text-purple-300 font-medium">Monto pagado:</span>
                        <span className="text-green-600 dark:text-green-400 font-bold">${entregaRegistrada.montoPagado.toFixed(2)}</span>
                      </div>
                    )}
                    
                    {/* Saldo pendiente */}
                    <div className="border-t border-purple-200 dark:border-purple-700 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-purple-700 dark:text-purple-300 font-medium">Saldo pendiente:</span>
                        <span className={`text-lg font-bold ${
                          entregaRegistrada.nuevoSaldo > 0 
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          ${entregaRegistrada.nuevoSaldo.toFixed(2)}
                        </span>
                      </div>
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