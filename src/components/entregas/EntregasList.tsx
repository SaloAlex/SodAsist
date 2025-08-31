import React, { useState, useEffect, useMemo } from 'react';
import { DataTable } from '../common/DataTable';
import { Entrega, Cliente } from '../../types';
import { FirebaseService } from '../../services/firebaseService';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { 
  Package, 
  Search, 
  Download, 
  Plus,
  Calendar,
  DollarSign,
  User,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useFirestoreSubscription } from '../../hooks/useFirestoreSubscription';

export const EntregasList: React.FC = () => {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clientesLoaded, setClientesLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  
  const navigate = useNavigate();
  const { user, userData } = useAuthStore();

  // Cargar datos
  useEffect(() => {
    if (!user || !userData) return;

    const loadData = async () => {
      try {
        setLoading(true);
        
        // Cargar clientes primero
        const clientesData = await FirebaseService.getClientes();
        setClientes(clientesData);
        setClientesLoaded(true);
        
        // Luego cargar entregas
        const entregasData = await FirebaseService.getEntregas();
        setEntregas(entregasData);
      } catch (error) {
        toast.error('Error al cargar las entregas');
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, userData]);

  // Usar el hook personalizado para suscripciones
  useFirestoreSubscription<Entrega>({
    collectionName: 'entregas',
    onData: setEntregas,
    enabled: !loading && !!user && !!userData,
    dependencies: [loading, user, userData]
  });

  useFirestoreSubscription<Cliente>({
    collectionName: 'clientes',
    onData: setClientes,
    enabled: !loading && !!user && !!userData,
    dependencies: [loading, user, userData]
  });

  // Filtrar entregas
  const filteredEntregas = useMemo(() => {
    let filtered = entregas;

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(entrega => {
        const cliente = clientes.find(c => c.id === entrega.clienteId);
        return cliente?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               entrega.observaciones?.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Filtro por estado de pago
    if (statusFilter !== 'all') {
      filtered = filtered.filter(entrega => 
        statusFilter === 'paid' ? entrega.pagado : !entrega.pagado
      );
    }

    // Filtro por fecha
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(entrega => {
        const entregaDate = new Date(entrega.fecha);
        const entregaDay = new Date(entregaDate.getFullYear(), entregaDate.getMonth(), entregaDate.getDate());
        
        switch (dateFilter) {
          case 'today':
            return entregaDay.getTime() === today.getTime();
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return entregaDay >= weekAgo;
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            return entregaDay >= monthAgo;
          default:
            return true;
        }
      });
    }

    return filtered.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [entregas, clientes, searchTerm, statusFilter, dateFilter]);

  // Columnas para la tabla
  const columns = [
    {
      key: 'clienteId' as keyof Entrega,
      label: 'Cliente',
                     render: (value: unknown) => {
          const clienteId = value as string;
          const cliente = clientes.find(c => c.id === clienteId);
          
          // Si no hay cliente, mostrar un mensaje informativo
          if (!cliente) {
            return (
              <div className="flex items-center">
                <User className="h-4 w-4 text-red-400 mr-2" />
                <span className="text-red-600 italic text-sm">
                  {!clientesLoaded ? 'Cargando...' : 'Cliente eliminado'}
                </span>
              </div>
            );
          }
          
          return (
            <div className="flex items-center">
              <User className="h-4 w-4 text-gray-400 mr-2" />
              <span className="font-medium text-gray-900 dark:text-white">
                {cliente.nombre}
              </span>
            </div>
          );
        },
    },
    {
      key: 'fecha' as keyof Entrega,
      label: 'Fecha',
      render: (value: unknown) => {
        if (!value) return '';
        const fecha = new Date(value as Date);
        return (
          <div className="flex items-center">
            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
            <span>{isValid(fecha) ? format(fecha, 'dd/MM/yyyy HH:mm', { locale: es }) : 'Fecha inválida'}</span>
          </div>
        );
      },
    },
    {
      key: 'total' as keyof Entrega,
      label: 'Total',
      render: (value: unknown) => {
        const total = value as number;
        return (
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 text-green-500 mr-1" />
            <span className="font-semibold text-green-600">${(total || 0).toFixed(2)}</span>
          </div>
        );
      },
    },
    {
      key: 'pagado' as keyof Entrega,
      label: 'Estado',
      render: (value: unknown) => {
        const pagado = value as boolean;
        return (
          <div className="flex items-center">
            {pagado ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-green-600 font-medium">Pagado</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-500 mr-1" />
                <span className="text-red-600 font-medium">Pendiente</span>
              </>
            )}
          </div>
        );
      },
    },
    {
      key: 'sodas' as keyof Entrega,
      label: 'Productos',
      render: (value: unknown, row: Entrega) => {
        const sodas = value as number;
        const bidones10 = row.bidones10 || 0;
        const bidones20 = row.bidones20 || 0;
        
        return (
          <div className="text-sm">
            <div className="flex items-center">
              <Package className="h-4 w-4 text-blue-500 mr-1" />
              <span>
                {sodas} sodas, {bidones10} bidones 10L, {bidones20} bidones 20L
              </span>
            </div>
          </div>
        );
      },
    },
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [entregasData, clientesData] = await Promise.all([
        FirebaseService.getEntregas(),
        FirebaseService.getClientes()
      ]);
      setEntregas(entregasData);
      setClientes(clientesData);
      toast.success('Datos actualizados');
    } catch (error) {
      toast.error('Error al actualizar los datos');
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = () => {
    // Implementar exportación
    toast.success('Función de exportación próximamente');
  };

  if (!user || !userData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <User className="w-8 h-8 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">Iniciando sesión...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Cargando entregas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Package className="h-6 w-6 text-blue-600 mr-3" />
            Entregas
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestiona todas las entregas realizadas
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </button>

          <button
            onClick={handleExport}
            className="flex items-center px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </button>

          <button
            onClick={() => navigate('/entregas/new')}
            className="flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Entrega
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por cliente o observaciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Filtro de estado */}
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'paid' | 'pending')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Todos los estados</option>
              <option value="paid">Pagados</option>
              <option value="pending">Pendientes</option>
            </select>
          </div>

          {/* Filtro de fecha */}
          <div className="sm:w-48">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Todas las fechas</option>
              <option value="today">Hoy</option>
              <option value="week">Última semana</option>
              <option value="month">Último mes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <DataTable
          data={filteredEntregas}
          columns={columns}
          searchable={false} // Ya tenemos búsqueda personalizada
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            pageSizeOptions: [10, 15, 25, 50]
          }}
          emptyMessage="No se encontraron entregas"
        />
      </div>

      {/* Resumen */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">{filteredEntregas.length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Entregas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">
              ${filteredEntregas.reduce((sum, e) => sum + e.total, 0).toFixed(2)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Ventas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">
              {filteredEntregas.filter(e => e.pagado).length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Pagadas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">
              {filteredEntregas.filter(e => !e.pagado).length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Pendientes</p>
          </div>
        </div>
      </div>
    </div>
  );
};
