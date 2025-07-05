import React, { useState, useEffect } from 'react';
import { StatsCard } from '../components/dashboard/StatsCard';
import { ChartCard } from '../components/dashboard/ChartCard';
import { DataTable } from '../components/common/DataTable';
import { 
  Package, 
  DollarSign, 
  Users, 
  TrendingUp,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { FirebaseService } from '../services/firebaseService';
import { Entrega, Cliente } from '../types';
import { format, isValid, parseISO, subDays, startOfDay, endOfDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

export const Dashboard: React.FC = () => {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [entregasAyer, setEntregasAyer] = useState<Entrega[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const loadEntregasByDate = async (date: Date) => {
    try {
      setLoading(true);
      const inicio = startOfDay(date);
      const fin = endOfDay(date);
      const diaAnterior = subDays(date, 1);
      const inicioAnterior = startOfDay(diaAnterior);
      const finAnterior = endOfDay(diaAnterior);

      const [entregasData, entregasAyerData] = await Promise.all([
        FirebaseService.getEntregasByDateRange(inicio, fin),
        FirebaseService.getEntregasByDateRange(inicioAnterior, finAnterior)
      ]);

      setEntregas(entregasData);
      setEntregasAyer(entregasAyerData);
    } catch (err) {
      toast.error('Error al cargar datos: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  // Efecto para suscribirse a la colección de clientes
  useEffect(() => {
    const unsubscribeClientes = FirebaseService.subscribeToCollection<Cliente>(
      'clientes',
      (data) => setClientes(data)
    );

    return () => {
      unsubscribeClientes();
    };
  }, []); // Solo se ejecuta al montar el componente

  // Efecto para cargar las entregas cuando cambia la fecha
  useEffect(() => {
    loadEntregasByDate(selectedDate);
  }, [selectedDate]); // Se ejecuta cuando cambia selectedDate

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  const handlePreviousDay = () => {
    setSelectedDate(prevDate => subDays(prevDate, 1));
  };

  const handleNextDay = () => {
    const nextDay = addDays(selectedDate, 1);
    if (nextDay <= new Date()) {
      setSelectedDate(nextDay);
    }
  };

  const stats = {
    entregasHoy: entregas.length,
    entregasAyer: entregasAyer.length,
    ventasHoy: entregas.reduce((sum, e) => sum + e.total, 0),
    ventasAyer: entregasAyer.reduce((sum, e) => sum + e.total, 0),
    clientesTotal: clientes.length,
    clientesConDeuda: clientes.filter(c => (c.saldoPendiente || 0) > 0).length,
  };

  const calcularCambio = (actual: number, anterior: number): { value: number, positive: boolean } => {
    if (anterior === 0) return { value: 100, positive: true };
    const cambio = ((actual - anterior) / anterior) * 100;
    return {
      value: Math.abs(Math.round(cambio * 10) / 10),
      positive: cambio >= 0
    };
  };

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

  const chartData = entregas.map(e => {
    const fecha = parseDate(e.fecha);
    return {
      hora: format(fecha, 'HH:mm'),
      total: e.total,
    };
  });

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
      label: 'Estado',
      render: (value: unknown) => {
        const pagado = value as boolean;
        return (
          <span className={`px-2 py-1 rounded-full text-xs ${
            pagado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {pagado ? 'Pagado' : 'Pendiente'}
          </span>
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePreviousDay}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <div className="relative">
              <input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => handleDateChange(parseISO(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
            </div>

            <button
              onClick={handleNextDay}
              disabled={selectedDate >= startOfDay(new Date())}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title={selectedDate.toDateString() === new Date().toDateString() ? "Entregas Hoy" : "Entregas"}
          value={stats.entregasHoy}
          icon={Package}
          color="blue"
          change={calcularCambio(stats.entregasHoy, stats.entregasAyer)}
        />
        <StatsCard
          title={selectedDate.toDateString() === new Date().toDateString() ? "Ventas Hoy" : "Ventas"}
          value={`$${stats.ventasHoy.toFixed(2)}`}
          icon={DollarSign}
          color="green"
          change={calcularCambio(stats.ventasHoy, stats.ventasAyer)}
        />
        <StatsCard
          title="Total Clientes"
          value={stats.clientesTotal}
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Clientes con Deuda"
          value={stats.clientesConDeuda}
          icon={TrendingUp}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Ventas por Hora"
          data={chartData}
          type="line"
          dataKey="total"
          xAxisKey="hora"
          color="#3B82F6"
        />
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Acciones Rápidas
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => window.location.href = '/entregas/new'}
              className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
            >
              <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-700 dark:text-blue-300">Nueva Entrega</span>
            </button>
            <button
              onClick={() => window.location.href = '/ruta-hoy'}
              className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900 rounded-lg hover:bg-green-100 dark:hover:bg-green-800 transition-colors"
            >
              <MapPin className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300">Ver Ruta</span>
            </button>
            <button
              onClick={() => window.location.href = '/clientes'}
              className="flex items-center space-x-3 p-3 bg-purple-50 dark:bg-purple-900 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-800 transition-colors"
            >
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span className="text-purple-700 dark:text-purple-300">Gestionar Clientes</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Entregas de Hoy
          </h3>
        </div>
        <DataTable
          data={entregas}
          columns={entregasColumns}
          searchable={false}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: [5, 10, 20, 50]
          }}
        />
      </div>
    </div>
  );
};