import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StatsCard } from '../components/dashboard/StatsCard';
import { ChartCard } from '../components/dashboard/ChartCard';
import { ActivityWidget } from '../components/dashboard/ActivityWidget';
import { NotificationsWidget } from '../components/dashboard/NotificationsWidget';
import { DataTable } from '../components/common/DataTable';
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
  Grid,
  List,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard
} from 'lucide-react';
import { FirebaseService } from '../services/firebaseService';
import { Entrega, Cliente } from '../types';
import { format, isValid, parseISO, subDays, startOfDay, endOfDay, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { UserLimitReached } from '../components/common/UserLimitReached';
import { PlanInfo } from '../components/common/PlanInfo';

type ViewMode = 'grid' | 'list';
type DateRange = 'today' | 'week' | 'month' | 'custom';

export const Dashboard: React.FC = () => {
  // Estados principales
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [entregasAyer, setEntregasAyer] = useState<Entrega[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados de UI
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [autoRefresh, setAutoRefresh] = useState(false);
  
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

  // Auto-refresh cada 5 minutos si está habilitado
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDataByRange(dateRange, selectedDate);
    setRefreshing(false);
    toast.success('Datos actualizados');
  }, [dateRange, selectedDate, loadDataByRange]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      handleRefresh();
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [autoRefresh, handleRefresh]);

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
  const formatDateTitle = () => {
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
  };

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
    <div className="space-y-6">
      {/* Header mejorado */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <BarChart3 className="h-8 w-8 text-blue-600 mr-3" />
            Dashboard Ejecutivo
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Resumen completo de tu negocio - {formatDateTitle()}
          </p>
        </div>

        {/* Controles avanzados */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Selector de rango */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {[
              { key: 'today', label: 'Hoy', icon: Clock },
              { key: 'week', label: 'Semana', icon: Calendar },
              { key: 'month', label: 'Mes', icon: Calendar }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setDateRange(key as DateRange)}
                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  dateRange === key
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 mr-1.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Navegación de fecha */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePreviousDate}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              aria-label="Período anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <div className="relative">
              <input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => handleDateChange(parseISO(e.target.value))}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            <button
              onClick={handleNextDate}
              disabled={selectedDate >= startOfDay(new Date())}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              aria-label="Período siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Controles adicionales */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
              title="Actualizar datos"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </button>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg transition-colors ${
                autoRefresh 
                  ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' 
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              title={`Auto-refresh ${autoRefresh ? 'activado' : 'desactivado'}`}
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-pulse' : ''}`} />
            </button>

            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={`Cambiar a vista ${viewMode === 'grid' ? 'lista' : 'cuadrícula'}`}
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Alerta de límite de usuarios alcanzado */}
      <UserLimitReached />

      {/* Métricas principales mejoradas */}
      <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1'} gap-6`}>
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

      {/* Estadísticas de pago */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Entregas Pagadas</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.entregasPagadas}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">${stats.ventasPagadas.toFixed(2)}</p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pendientes de Pago</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.entregasPendientes}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">${stats.ventasPendientes.toFixed(2)}</p>
            </div>
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pagos en Efectivo</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.pagosEfectivo}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">💰 Efectivo</p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pagos Digitales</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.pagosTransferencia + stats.pagosTarjeta}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">🏦 {stats.pagosTransferencia} | 💳 {stats.pagosTarjeta}</p>
            </div>
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Sección de gráficos y widgets */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Gráfico principal */}
        <div className="xl:col-span-2">
          <ChartCard
            title="Ventas del Período"
            subtitle="Evolución de ventas por hora"
            data={chartData}
            type="area"
            dataKey="total"
            secondaryDataKey="litros"
            xAxisKey="hora"
            color="#3B82F6"
            height={350}
            loading={loading || refreshing}
            showLegend={true}
            gradient={true}
            animated={true}
            onRefresh={handleRefresh}
            onExport={() => toast.success('Exportando gráfico...')}
                         onMaximize={() => toast.success('Función de maximizar próximamente')}
          />
        </div>

        {/* Widget de notificaciones */}
        <div>
          <NotificationsWidget
            loading={loading}
            maxItems={5}
            onDismiss={(id) => toast.success(`Notificación ${id} descartada`)}
            onDismissAll={() => toast.success('Todas las notificaciones descartadas')}
            onMarkAllRead={() => toast.success('Notificaciones marcadas como leídas')}
          />
        </div>
      </div>

      {/* Sección de actividad y acciones */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Widget de actividad */}
        <div className="xl:col-span-2">
          <ActivityWidget
            loading={loading}
            maxItems={8}
            onRefresh={handleRefresh}
            onViewAll={() => navigate('/actividad')}
          />
        </div>

        {/* Panel de acciones rápidas mejorado */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
              Acciones Rápidas
            </h3>
            
            {/* Información del Plan */}
            <div className="mb-6">
              <PlanInfo />
            </div>
            
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
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.ticketPromedio.toFixed(0)}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Ticket Promedio</p>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.eficiencia.toFixed(0)}%</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Eficiencia</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de entregas mejorada */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Package className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
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
        </div>
        
        <DataTable
          data={entregas}
          columns={entregasColumns}
          searchable={true}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: [5, 10, 20, 50]
          }}
          emptyMessage="No hay entregas registradas para este período"
        />
      </div>
    </div>
  );
};