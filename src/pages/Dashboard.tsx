import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StatsCard } from '../components/dashboard/StatsCard';
import { ChartCard } from '../components/dashboard/ChartCard';
import { ActivityWidget } from '../components/dashboard/ActivityWidget';
import { NotificationsWidget } from '../components/dashboard/NotificationsWidget';
import { DataTable } from '../components/common/DataTable';
import { NotificationSettings } from '../components/common/NotificationSettings';
import { ChartMaximizeModal } from '../components/common/ChartMaximizeModal';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { ChartExportService } from '../services/chartExportService';
import { 
  Package, 
  DollarSign, 
  Users, 
  TrendingUp,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Eye,
  BarChart3,
  Settings,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard,
  Bell
} from 'lucide-react';
import { FirebaseService } from '../services/firebaseService';
import { Entrega, Cliente } from '../types';
import { format, isValid, parseISO, subDays, startOfDay, endOfDay, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { UserLimitReached } from '../components/common/UserLimitReached';

type DateRange = 'today' | 'week' | 'month' | 'custom';

export const Dashboard: React.FC = () => {
  // Estados principales
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [entregasAyer, setEntregasAyer] = useState<Entrega[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'notificaciones' | 'acciones' | 'actividad' | 'ventas' | 'entregas'>('notificaciones');
  
  // Estados de UI
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateRange, setDateRange] = useState<DateRange>('today');
  
  // Hook de notificaciones push
  const { initialize: initializePushNotifications } = usePushNotifications();
  
  const navigate = useNavigate();

  // Cargar datos por rango de fecha
  const loadDataByRange = useCallback(async (range: DateRange, date: Date) => {
    try {
      setLoading(true);
      let inicio: Date, fin: Date;
      
      switch (range) {
        case 'today':
          inicio = startOfDay(date);
          fin = endOfDay(date);
          break;
        case 'week':
          inicio = startOfWeek(date, { weekStartsOn: 1 });
          fin = endOfWeek(date, { weekStartsOn: 1 });
          break;
        case 'month':
          inicio = startOfMonth(date);
          fin = endOfMonth(date);
          break;
        default:
          inicio = startOfDay(date);
          fin = endOfDay(date);
      }

             // Cargar datos actuales y comparativos
       const [entregasData, entregasAyerData] = await Promise.all([
         FirebaseService.getEntregasByDateRange(inicio, fin),
         FirebaseService.getEntregasByDateRange(
           subDays(inicio, 1), 
           subDays(fin, 1)
         )
       ]);

       setEntregas(entregasData);
       setEntregasAyer(entregasAyerData);
    } catch (err) {
      toast.error('Error al cargar datos: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Función de actualización manual
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDataByRange(dateRange, selectedDate);
    setRefreshing(false);
    toast.success('Datos actualizados');
  }, [dateRange, selectedDate, loadDataByRange]);


  // Efecto para suscribirse a clientes
  useEffect(() => {
    const unsubscribeClientes = FirebaseService.subscribeToCollection<Cliente>(
      'clientes',
      (data) => setClientes(data)
    );

    return () => {
      unsubscribeClientes();
    };
  }, []);

  useEffect(() => {
    loadDataByRange(dateRange, selectedDate);
  }, [selectedDate, dateRange, loadDataByRange]);

  // Inicializar notificaciones push
  useEffect(() => {
    initializePushNotifications();
  }, [initializePushNotifications]);

  // Funciones de navegación de fecha
  const handlePreviousDate = () => {
    switch (dateRange) {
      case 'today':
        setSelectedDate(prevDate => subDays(prevDate, 1));
        break;
      case 'week':
        setSelectedDate(prevDate => subDays(prevDate, 7));
        break;
      case 'month':
        setSelectedDate(prevDate => subDays(prevDate, 30));
        break;
    }
  };

  const handleNextDate = () => {
    const nextDate = (() => {
      switch (dateRange) {
        case 'today':
          return addDays(selectedDate, 1);
        case 'week':
          return addDays(selectedDate, 7);
        case 'month':
          return addDays(selectedDate, 30);
        default:
          return addDays(selectedDate, 1);
      }
    })();
    
    if (nextDate <= new Date()) {
      setSelectedDate(nextDate);
    }
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  // Calcular estadísticas
  const stats = useMemo(() => {
    const entregasCount = entregas.length;
    const entregasAyerCount = entregasAyer.length;
    const ventasHoy = entregas.reduce((sum, e) => sum + e.total, 0);
    const ventasAyer = entregasAyer.reduce((sum, e) => sum + e.total, 0);
    const clientesTotal = clientes.length;
    const clientesConDeuda = clientes.filter(c => (c.saldoPendiente || 0) > 0).length;
    const litrosVendidos = entregas.reduce((sum, e) => 
      sum + (e.sodas || 0) + (e.bidones10 || 0) * 10 + (e.bidones20 || 0) * 20, 0
    );
    const ticketPromedio = entregasCount > 0 ? ventasHoy / entregasCount : 0;

    // Estadísticas de pago
    const entregasPagadas = entregas.filter(e => e.pagado).length;
    const entregasPendientes = entregas.filter(e => !e.pagado).length;
    const ventasPagadas = entregas.filter(e => e.pagado).reduce((sum, e) => sum + e.total, 0);
    const ventasPendientes = entregas.filter(e => !e.pagado).reduce((sum, e) => sum + e.total, 0);
    
    // Métodos de pago
    const pagosEfectivo = entregas.filter(e => e.pagado && e.medioPago === 'efectivo').length;
    const pagosTransferencia = entregas.filter(e => e.pagado && e.medioPago === 'transferencia').length;
    const pagosTarjeta = entregas.filter(e => e.pagado && e.medioPago === 'tarjeta').length;

    return {
      entregasHoy: entregasCount,
      entregasAyer: entregasAyerCount,
      ventasHoy,
      ventasAyer,
      clientesTotal,
      clientesConDeuda,
      litrosVendidos,
      ticketPromedio,
      eficiencia: clientesTotal > 0 ? (entregasCount / clientesTotal) * 100 : 0,
      // Estadísticas de pago
      entregasPagadas,
      entregasPendientes,
      ventasPagadas,
      ventasPendientes,
      pagosEfectivo,
      pagosTransferencia,
      pagosTarjeta
    };
  }, [entregas, entregasAyer, clientes]);

  // Función para calcular cambios
  const calcularCambio = (actual: number, anterior: number) => {
    if (anterior === 0) return { value: actual > 0 ? 100 : 0, positive: actual >= 0 };
    const cambio = ((actual - anterior) / anterior) * 100;
    return {
      value: Math.abs(Math.round(cambio * 10) / 10),
      positive: cambio >= 0,
      period: dateRange === 'today' ? 'ayer' : 'período anterior'
    };
  };

  // Función para parsear fechas
  const parseDate = (date: Date | string | number): Date => {
    if (date instanceof Date) {
      return isValid(date) ? date : new Date();
    }
    if (typeof date === 'string') {
      const parsed = parseISO(date);
      return isValid(parsed) ? parsed : new Date();
    }
    if (typeof date === 'number') {
      const parsed = new Date(date);
      return isValid(parsed) ? parsed : new Date();
    }
    return new Date();
  };

  // Datos para gráficos
  const chartData = useMemo(() => {
    return entregas.map(e => {
      const fecha = parseDate(e.fecha);
      return {
        hora: format(fecha, 'HH:mm'),
        total: e.total,
        litros: (e.sodas || 0) + (e.bidones10 || 0) * 10 + (e.bidones20 || 0) * 20
      };
    }).sort((a, b) => a.hora.localeCompare(b.hora));
  }, [entregas]);

  // (Bloque de tendenciasData comentado temporalmente hasta que se utilice)

  // Columnas para la tabla de entregas
  const entregasColumns = [
    {
      key: 'clienteId' as keyof Entrega,
      label: 'Cliente',
      render: (value: unknown) => {
        const clienteId = value as string;
        const cliente = clientes.find(c => c.id === clienteId);
        return cliente?.nombre || 'Cliente no encontrado';
      },
    },
    {
      key: 'total' as keyof Entrega,
      label: 'Total',
      render: (value: unknown) => {
        const total = value as number;
        return `$${(total || 0).toFixed(2)}`;
      },
    },
    {
      key: 'pagado' as keyof Entrega,
      label: 'Estado de Pago',
      render: (value: unknown, row: Entrega) => {
        const pagado = value as boolean;
        const medioPago = row.medioPago;
        
        return (
          <div className="flex flex-col">
            <span className={`px-2 py-1 rounded-full text-xs ${
              pagado ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {pagado ? 'Pagado' : 'Pendiente'}
            </span>
            {pagado && medioPago && (
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
                {medioPago === 'efectivo' && '💰 Efectivo'}
                {medioPago === 'transferencia' && '🏦 Transferencia'}
                {medioPago === 'tarjeta' && '💳 Tarjeta'}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'fecha' as keyof Entrega,
      label: 'Hora',
      render: (value: unknown) => {
        if (!value) return '';
        const fecha = parseDate(value as Date);
        return format(fecha, 'HH:mm', { locale: es });
      },
    },
  ];

  // Formatear título de fecha según el rango
  const formatDateTitle = useCallback(() => {
    switch (dateRange) {
      case 'today':
        return selectedDate.toDateString() === new Date().toDateString() ? 'Hoy' : format(selectedDate, 'd/MM/yyyy');
      case 'week':
        return `Semana del ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'd/MM')} al ${format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'd/MM')}`;
      case 'month':
        return format(selectedDate, 'MMMM yyyy', { locale: es });
      default:
        return format(selectedDate, 'd/MM/yyyy');
    }
  }, [dateRange, selectedDate]);

  // Función para exportar gráfico
  const handleExportChart = useCallback(async (format: 'png' | 'pdf' | 'csv') => {
    try {
      const exportData = {
        title: 'Ventas del Período',
        subtitle: 'Evolución de ventas por hora',
        data: chartData,
        dataKey: 'total',
        secondaryDataKey: 'litros',
        xAxisKey: 'hora',
        type: 'area' as const,
        color: '#3B82F6',
        dateRange: formatDateTitle()
      };

      let blob: Blob;
      let filename: string;

      switch (format) {
        case 'png': {
          // Para PNG necesitamos el elemento del gráfico
          const chartElement = document.querySelector('[data-chart="ventas"]') as HTMLElement;
          if (!chartElement) {
            toast.error('No se pudo encontrar el gráfico para exportar');
            return;
          }
          blob = await ChartExportService.exportChartAsPNG(chartElement);
          filename = `grafico_ventas_${new Date().toISOString().split('T')[0]}.png`;
          break;
        }
        case 'pdf': {
          blob = await ChartExportService.exportChartAsPDF(exportData);
          filename = `grafico_ventas_${new Date().toISOString().split('T')[0]}.pdf`;
          break;
        }
        case 'csv': {
          blob = await ChartExportService.exportChartAsCSV(exportData);
          filename = `datos_ventas_${new Date().toISOString().split('T')[0]}.csv`;
          break;
        }
      }

      ChartExportService.downloadFile(blob, filename);
      toast.success(`Gráfico exportado como ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Error al exportar el gráfico');
      console.error('Error exportando gráfico:', error);
    }
  }, [chartData, formatDateTitle]);

  // Función para maximizar gráfico
  const handleMaximizeChart = useCallback(() => {
    setShowChartModal(true);
  }, []);

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header mejorado con mejor UX/UI */}
      <div className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-lg border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {/* Título principal */}
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white flex items-center mb-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mr-3 shadow-lg">
                <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <span className="hidden sm:inline">Dashboard Ejecutivo</span>
              <span className="sm:hidden">Dashboard</span>
            </h1>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                {formatDateTitle()}
              </p>
            </div>
          </div>

          {/* Panel de controles mejorado */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
              
              {/* Selector de período mejorado */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Período:</span>
                </div>
                <div className="flex items-center bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl p-1 shadow-inner">
                  {[
                    { key: 'today', label: 'Hoy', icon: Clock, color: 'blue' },
                    { key: 'week', label: 'Semana', icon: Calendar, color: 'green' },
                    { key: 'month', label: 'Mes', icon: Calendar, color: 'purple' }
                  ].map(({ key, label, icon: Icon, color }) => (
                    <button
                      key={key}
                      onClick={() => setDateRange(key as DateRange)}
                      className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                        dateRange === key
                          ? `bg-white dark:bg-gray-600 text-${color}-600 dark:text-${color}-400 shadow-md transform scale-105`
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-500/50'
                      }`}
                    >
                      <Icon className={`h-4 w-4 mr-2 ${
                        dateRange === key
                          ? `text-${color}-600 dark:text-${color}-400`
                          : 'text-gray-600 dark:text-gray-400'
                      }`} />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Navegación de fecha mejorada */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Fecha:</span>
                </div>
                <div className="flex items-center bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl p-1 shadow-inner">
                  <button
                    onClick={handlePreviousDate}
                    className="p-2 rounded-lg hover:bg-white dark:hover:bg-gray-500 transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:shadow-md"
                    aria-label="Período anterior"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  <div className="px-3 py-2 flex items-center">
                    <input
                      type="date"
                      value={format(selectedDate, 'yyyy-MM-dd')}
                      onChange={(e) => handleDateChange(parseISO(e.target.value))}
                      className="px-3 py-2 text-sm border-0 bg-transparent focus:ring-0 focus:outline-none dark:text-white font-medium [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                    />
                    <Calendar className="h-4 w-4 ml-2 text-gray-500 dark:text-gray-300" />
                  </div>

                  <button
                    onClick={handleNextDate}
                    disabled={selectedDate >= startOfDay(new Date())}
                    className="p-2 rounded-lg hover:bg-white dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:shadow-md"
                    aria-label="Período siguiente"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Acciones mejoradas */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-blue-400 disabled:to-blue-500 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                  title="Actualizar datos"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Actualizar</span>
                </button>

                <button
                  onClick={() => setShowNotificationSettings(true)}
                  className="p-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  title="Configurar notificaciones"
                >
                  <Bell className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Alerta de límite de usuarios alcanzado */}
        <UserLimitReached />

        {/* Panel de Métricas Principales */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />
              Métricas Principales
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
              <StatsCard
                title={dateRange === 'today' ? "Entregas Hoy" : "Entregas"}
                value={stats.entregasHoy}
                icon={Package}
                color="blue"
                change={calcularCambio(stats.entregasHoy, stats.entregasAyer)}
                subtitle="Entregas completadas"
                showProgress={true}
                progressValue={stats.entregasHoy}
                target={50}
                description="Número total de entregas realizadas en el período"
                actionLabel="Ver entregas"
                onAction={() => navigate('/entregas')}
                variant="default"
                trend={[stats.entregasAyer || 0, stats.entregasHoy || 0]}
              />

              <StatsCard
                title={dateRange === 'today' ? "Ventas Hoy" : "Ventas"}
                value={`$${stats.ventasHoy.toFixed(2)}`}
                icon={DollarSign}
                color="green"
                change={calcularCambio(stats.ventasHoy, stats.ventasAyer)}
                subtitle="Ingresos del período"
                showProgress={true}
                progressValue={stats.ventasHoy}
                target={10000}
                description="Total de ingresos generados"
                actionLabel="Ver reportes"
                onAction={() => navigate('/reportes')}
                variant="gradient"
              />

              <StatsCard
                title="Total Clientes"
                value={stats.clientesTotal}
                icon={Users}
                color="purple"
                subtitle={`${stats.clientesConDeuda} con deuda`}
                description="Base total de clientes registrados"
                actionLabel="Gestionar"
                onAction={() => navigate('/clientes')}
                variant="default"
              />

              <StatsCard
                title="Litros Vendidos"
                value={stats.litrosVendidos}
                icon={TrendingUp}
                color="orange"
                subtitle="Volumen total"
                showProgress={true}
                progressValue={stats.litrosVendidos}
                target={500}
                description="Litros de agua vendidos"
                actionLabel="Ver inventario"
                onAction={() => navigate('/inventario')}
                variant="default"
              />
            </div>
          </div>
        </div>

        {/* Panel de Análisis de Pagos */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <CreditCard className="h-5 w-5 text-green-600 mr-2" />
              Análisis de Pagos
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">Entregas Pagadas</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.entregasPagadas}</p>
                    <p className="text-xs text-green-600 dark:text-green-400">${stats.ventasPagadas.toFixed(2)}</p>
                  </div>
                  <div className="p-2 bg-green-200 dark:bg-green-800 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">Pendientes de Pago</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.entregasPendientes}</p>
                    <p className="text-xs text-red-600 dark:text-red-400">${stats.ventasPendientes.toFixed(2)}</p>
                  </div>
                  <div className="p-2 bg-red-200 dark:bg-red-800 rounded-lg">
                    <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Pagos en Efectivo</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.pagosEfectivo}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">💰 Efectivo</p>
                  </div>
                  <div className="p-2 bg-blue-200 dark:bg-blue-800 rounded-lg">
                    <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Pagos Digitales</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.pagosTransferencia + stats.pagosTarjeta}</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400">🏦 {stats.pagosTransferencia} | 💳 {stats.pagosTarjeta}</p>
                  </div>
                  <div className="p-2 bg-purple-200 dark:bg-purple-800 rounded-lg">
                    <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Panel Unificado con Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header con tabs */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Panel de Control
              </h2>
              
              {/* Tabs de navegación */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1 overflow-x-auto min-w-0">
                <button
                  onClick={() => setActiveTab('notificaciones')}
                  className={`flex items-center px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'notificaciones'
                      ? 'bg-white dark:bg-gray-600 text-orange-600 dark:text-orange-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Notificaciones"
                >
                  <Bell className="h-4 w-4 mr-1 sm:mr-1.5" />
                  <span className="hidden sm:inline">Notificaciones</span>
                </button>
                
                <button
                  onClick={() => setActiveTab('acciones')}
                  className={`flex items-center px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'acciones'
                      ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Acciones Rápidas"
                >
                  <Settings className="h-4 w-4 mr-1 sm:mr-1.5" />
                  <span className="hidden sm:inline">Acciones</span>
                </button>
                
                <button
                  onClick={() => setActiveTab('actividad')}
                  className={`flex items-center px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'actividad'
                      ? 'bg-white dark:bg-gray-600 text-green-600 dark:text-green-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Actividad Reciente"
                >
                  <TrendingUp className="h-4 w-4 mr-1 sm:mr-1.5" />
                  <span className="hidden sm:inline">Actividad</span>
                </button>

                <button
                  onClick={() => setActiveTab('ventas')}
                  className={`flex items-center px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'ventas'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Análisis de Ventas"
                >
                  <BarChart3 className="h-4 w-4 mr-1 sm:mr-1.5" />
                  <span className="hidden sm:inline">Ventas</span>
                </button>

                <button
                  onClick={() => setActiveTab('entregas')}
                  className={`flex items-center px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'entregas'
                      ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Entregas de Hoy"
                >
                  <Package className="h-4 w-4 mr-1 sm:mr-1.5" />
                  <span className="hidden sm:inline">Entregas</span>
                </button>
              </div>
            </div>
          </div>

          {/* Contenido del tab activo */}
          <div className="p-4 sm:p-6">
            {activeTab === 'notificaciones' && (
              <NotificationsWidget
                maxItems={5}
                showCreateSample={true}
              />
            )}

            {activeTab === 'acciones' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/entregas/new')}
                    className="w-full flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-800/30 dark:hover:to-blue-700/30 transition-all group"
                  >
                    <div className="p-2 bg-blue-600 text-white rounded-lg group-hover:scale-110 transition-transform">
                      <Package className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <span className="text-blue-700 dark:text-blue-300 font-medium">Nueva Entrega</span>
                      <p className="text-xs text-blue-600 dark:text-blue-400">Registrar nueva entrega</p>
                    </div>
                  </button>

                  <button
                    onClick={() => navigate('/ruta-hoy')}
                    className="w-full flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg hover:from-green-100 hover:to-green-200 dark:hover:from-green-800/30 dark:hover:to-green-700/30 transition-all group"
                  >
                    <div className="p-2 bg-green-600 text-white rounded-lg group-hover:scale-110 transition-transform">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <span className="text-green-700 dark:text-green-300 font-medium">Ver Ruta</span>
                      <p className="text-xs text-green-600 dark:text-green-400">Ruta optimizada del día</p>
                    </div>
                  </button>

                  <button
                    onClick={() => navigate('/clientes')}
                    className="w-full flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-800/30 dark:hover:to-purple-700/30 transition-all group"
                  >
                    <div className="p-2 bg-purple-600 text-white rounded-lg group-hover:scale-110 transition-transform">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <span className="text-purple-700 dark:text-purple-300 font-medium">Gestionar Clientes</span>
                      <p className="text-xs text-purple-600 dark:text-purple-400">Administrar base de clientes</p>
                    </div>
                  </button>

                  <button
                    onClick={() => navigate('/reportes')}
                    className="w-full flex items-center space-x-3 p-4 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg hover:from-orange-100 hover:to-orange-200 dark:hover:from-orange-800/30 dark:hover:to-orange-700/30 transition-all group"
                  >
                    <div className="p-2 bg-orange-600 text-white rounded-lg group-hover:scale-110 transition-transform">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <span className="text-orange-700 dark:text-orange-300 font-medium">Ver Reportes</span>
                      <p className="text-xs text-orange-600 dark:text-orange-400">Análisis y estadísticas</p>
                    </div>
                  </button>
                </div>

                {/* Estadísticas rápidas */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Resumen Rápido</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-center">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">${stats.ticketPromedio.toFixed(0)}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Ticket Promedio</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.eficiencia.toFixed(0)}%</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Eficiencia</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'actividad' && (
              <ActivityWidget
                loading={loading}
                maxItems={8}
                onRefresh={handleRefresh}
                onViewAll={() => navigate('/actividad')}
              />
            )}

            {activeTab === 'ventas' && (
              <div className="space-y-4">
                {/* Header del tab de ventas */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Análisis de Ventas
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Evolución de ventas por hora - {formatDateTitle()}
                    </p>
                  </div>
                  
                  {/* Acciones adicionales del tab */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => navigate('/reportes')}
                      className="flex items-center px-3 py-1.5 text-sm text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <BarChart3 className="h-4 w-4 mr-1" />
                      Ver Reportes
                    </button>
                    
                    <button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="flex items-center px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                      Actualizar
                    </button>
                  </div>
                </div>

                {/* Gráfico con todas las acciones */}
                <div data-chart="ventas">
                  <ChartCard
                    title="Ventas del Período"
                    subtitle="Evolución de ventas por hora"
                    data={chartData}
                    type="area"
                    dataKey="total"
                    secondaryDataKey="litros"
                    xAxisKey="hora"
                    color="#3B82F6"
                    height={300}
                    loading={loading || refreshing}
                    showLegend={true}
                    gradient={true}
                    animated={true}
                    onRefresh={handleRefresh}
                    onExport={() => handleExportChart('png')}
                    onMaximize={handleMaximizeChart}
                  />
                </div>

                {/* Estadísticas rápidas de ventas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Ventas Totales</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          ${stats.ventasHoy.toFixed(2)}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          {chartData.length} períodos
                        </p>
                      </div>
                      <div className="p-2 bg-blue-200 dark:bg-blue-800 rounded-lg">
                        <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">Ticket Promedio</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          ${stats.ticketPromedio.toFixed(2)}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Por entrega
                        </p>
                      </div>
                      <div className="p-2 bg-green-200 dark:bg-green-800 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Litros Vendidos</p>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {stats.litrosVendidos}
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-400">
                          Volumen total
                        </p>
                      </div>
                      <div className="p-2 bg-purple-200 dark:bg-purple-800 rounded-lg">
                        <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'entregas' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    Entregas de {formatDateTitle()}
                    {stats.entregasHoy > 0 && (
                      <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                        {stats.entregasHoy}
                      </span>
                    )}
                  </h3>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => navigate('/entregas')}
                      className="flex items-center px-3 py-1.5 text-sm text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver todas
                    </button>
                    
                    <button className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <DataTable
                  data={entregas}
                  columns={entregasColumns}
                  searchable={true}
                  pagination={{
                    pageSize: 8,
                    showSizeChanger: true,
                    pageSizeOptions: [5, 8, 10, 20]
                  }}
                  emptyMessage="No hay entregas registradas para este período"
                />
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal de configuración de notificaciones */}
      <NotificationSettings
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />

      {/* Modal de gráfico maximizado */}
      <ChartMaximizeModal
        isOpen={showChartModal}
        onClose={() => setShowChartModal(false)}
        chartData={{
          title: 'Ventas del Período',
          subtitle: 'Evolución de ventas por hora',
          data: chartData,
          dataKey: 'total',
          secondaryDataKey: 'litros',
          xAxisKey: 'hora',
          type: 'area',
          color: '#3B82F6',
          dateRange: formatDateTitle()
        }}
        onRefresh={handleRefresh}
        loading={loading || refreshing}
      />
    </div>
  );
};