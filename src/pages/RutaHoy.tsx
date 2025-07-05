import React, { useState, useEffect } from 'react';
import { Cliente } from '../types';
import { FirebaseService } from '../services/firebaseService';
import { RouteOptimizer } from '../services/routeOptimizer';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { MapPin, Navigation, Clock, Phone, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const RutaHoy: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [rutaOptimizada, setRutaOptimizada] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [completedClients, setCompletedClients] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    try {
      const data = await FirebaseService.getCollection<Cliente>('clientes');
      const clientesParaHoy = filterClientesParaHoy(data);
      setClientes(clientesParaHoy);
      
      if (clientesParaHoy.length > 0) {
        optimizeRoute(clientesParaHoy);
      }
    } catch (error) {
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const filterClientesParaHoy = (clientes: Cliente[]): Cliente[] => {
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    return clientes.filter(cliente => {
      switch (cliente.frecuenciaVisita) {
        case 'diaria':
          return true;
        case 'semanal':
          return today === 1; // Lunes
        case 'bisemanal':
          return today === 1 || today === 4; // Lunes y Jueves
        case 'mensual':
          return new Date().getDate() === 1; // Primer día del mes
        default:
          return false;
      }
    });
  };

  const optimizeRoute = async (clientesData: Cliente[]) => {
    setOptimizing(true);
    try {
      const optimized = await RouteOptimizer.optimizeRoute(clientesData);
      setRutaOptimizada(optimized);
    } catch (error) {
      toast.error('Error al optimizar ruta');
    } finally {
      setOptimizing(false);
    }
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
    if (cliente.lat && cliente.lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${cliente.lat},${cliente.lng}`;
      window.open(url, '_blank');
    } else {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cliente.direccion)}`;
      window.open(url, '_blank');
    }
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Ruta de Hoy
        </h1>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {completedClients.size} de {rutaOptimizada.length} completados
          </span>
          {optimizing && <LoadingSpinner size="sm" />}
        </div>
      </div>

      {rutaOptimizada.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No hay clientes programados para hoy
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Todos los clientes han sido visitados según su frecuencia programada.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista de clientes */}
          <div className="space-y-4">
            {rutaOptimizada.map((cliente, index) => (
              <div
                key={cliente.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-all ${
                  completedClients.has(cliente.id) 
                    ? 'opacity-50 bg-green-50 dark:bg-green-900' 
                    : 'hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        completedClients.has(cliente.id)
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {completedClients.has(cliente.id) ? '✓' : index + 1}
                      </div>
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
                      </div>
                      {cliente.saldoPendiente && cliente.saldoPendiente > 0 && (
                        <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                          Saldo pendiente: ${cliente.saldoPendiente.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => toggleClientCompleted(cliente.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        completedClients.has(cliente.id)
                          ? 'bg-green-100 text-green-600 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <CheckCircle className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => openInGoogleMaps(cliente)}
                      className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                    >
                      <Navigation className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Resumen */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Resumen de la Ruta
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total de clientes:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {rutaOptimizada.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Completados:</span>
                <span className="font-medium text-green-600">
                  {completedClients.size}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Pendientes:</span>
                <span className="font-medium text-red-600">
                  {rutaOptimizada.length - completedClients.size}
                </span>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Progreso:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {Math.round((completedClients.size / rutaOptimizada.length) * 100)}%
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(completedClients.size / rutaOptimizada.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};