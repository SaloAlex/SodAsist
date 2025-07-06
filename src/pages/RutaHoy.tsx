import React, { useState, useEffect, useCallback } from 'react';
import { Cliente } from '../types';
import { FirebaseService } from '../services/firebaseService';
import { RouteOptimizer } from '../services/routeOptimizer';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { MapPin, Navigation, Clock, Phone, CheckCircle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export const RutaHoy: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [rutaOptimizada, setRutaOptimizada] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [completedClients, setCompletedClients] = useState<Set<string>>(new Set());

  const optimizeRoute = useCallback(async (clientesData: Cliente[]) => {
    setOptimizing(true);
    try {
      const optimized = await RouteOptimizer.optimizeRoute(clientesData);
      setRutaOptimizada(optimized);
    } catch {
      toast.error('Error al optimizar ruta');
    } finally {
      setOptimizing(false);
    }
  }, []);

  const loadClientes = useCallback(async () => {
    try {
      const data = await FirebaseService.getCollection<Cliente>('clientes');
      const clientesParaHoy = filterClientesParaHoy(data);
      setClientes(clientesParaHoy);
      
      if (clientesParaHoy.length > 0) {
        optimizeRoute(clientesParaHoy);
      }
    } catch {
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, [optimizeRoute]);

  useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  const filterClientesParaHoy = (clientes: Cliente[]): Cliente[] => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayOfMonth = today.getDate();
    const weekOfYear = Math.ceil(dayOfMonth / 7);
    
    // Mapa de días de la semana
    const daysMap = {
      0: 'domingo',
      1: 'lunes',
      2: 'martes',
      3: 'miércoles',
      4: 'jueves',
      5: 'viernes',
      6: 'sábado'
    };
    
    const todayName = daysMap[dayOfWeek as keyof typeof daysMap];
    
    return clientes.filter(cliente => {
      // Verificar si el cliente tiene programada visita hoy
      if (cliente.diaVisita !== todayName) {
        return false;
      }
      
      switch (cliente.frecuenciaVisita) {
        case 'semanal':
          return true; // Cada semana en el día especificado
        case 'quincenal':
          return weekOfYear % 2 === 1; // Semanas impares
        case 'mensual':
          return dayOfMonth <= 7; // Primera semana del mes
        default:
          return false;
      }
    });
  };

  const toggleClientCompleted = (clienteId: string) => {
    const newCompleted = new Set(completedClients);
    if (newCompleted.has(clienteId)) {
      newCompleted.delete(clienteId);
    } else {
      newCompleted.add(clienteId);
    }
    setCompletedClients(newCompleted);
  };

  const openInGoogleMaps = (cliente: Cliente) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cliente.direccion)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Ruta de Hoy
          </h1>
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="h-4 w-4" />
            <span>{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-center">
              <Navigation className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Clientes Programados
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {clientes.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Completados
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {completedClients.size}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Pendientes
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {clientes.length - completedClients.size}
                </p>
              </div>
            </div>
          </div>
        </div>

        {optimizing && (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">
              Optimizando ruta...
            </span>
          </div>
        )}

        {rutaOptimizada.length === 0 && !optimizing && (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No hay clientes programados para hoy
            </p>
          </div>
        )}

        {rutaOptimizada.length > 0 && (
          <div className="space-y-4">
            {rutaOptimizada.map((cliente, index) => (
              <div
                key={cliente.id}
                className={`bg-white dark:bg-gray-700 rounded-lg border-2 transition-all ${
                  completedClients.has(cliente.id!)
                    ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        completedClients.has(cliente.id!) ? 'bg-green-500' : 'bg-blue-500'
                      }`}>
                        {completedClients.has(cliente.id!) ? '✓' : index + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {cliente.nombre}
                        </h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                          <MapPin className="h-4 w-4" />
                          <span>{cliente.direccion}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                          <Phone className="h-4 w-4" />
                          <span>{cliente.telefono}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                          <Clock className="h-4 w-4" />
                          <span className="capitalize">{cliente.frecuenciaVisita}</span>
                          <span>•</span>
                          <span className="capitalize">{cliente.diaVisita}</span>
                        </div>
                        {cliente.saldoPendiente && cliente.saldoPendiente > 0 && (
                          <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                            Saldo pendiente: ${cliente.saldoPendiente.toFixed(2)}
                          </div>
                        )}
                        {cliente.observaciones && (
                          <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            <strong>Observaciones:</strong> {cliente.observaciones}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openInGoogleMaps(cliente)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors dark:text-blue-400 dark:hover:bg-blue-900/20"
                        title="Abrir en Google Maps"
                      >
                        <Navigation className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => toggleClientCompleted(cliente.id!)}
                        className={`p-2 rounded-lg transition-colors ${
                          completedClients.has(cliente.id!)
                            ? 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20'
                            : 'text-gray-400 hover:bg-gray-50 dark:text-gray-500 dark:hover:bg-gray-600'
                        }`}
                        title={completedClients.has(cliente.id!) ? 'Marcar como pendiente' : 'Marcar como completado'}
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};