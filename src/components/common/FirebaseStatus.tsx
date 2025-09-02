import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { FirebaseService } from '../../services/firebaseService';
import { Wifi, WifiOff, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

export const FirebaseStatus: React.FC = () => {
  const { user, userData } = useAuthStore();
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkConnection = async () => {
    setConnectionStatus('checking');
    try {
      // Intentar una operación simple para verificar la conexión
      await FirebaseService.getCollection('users');
      setConnectionStatus('connected');
      setLastCheck(new Date());
    } catch (error) {
      console.error('Error checking Firebase connection:', error);
      setConnectionStatus('error');
      setLastCheck(new Date());
    }
  };

  useEffect(() => {
    checkConnection();
    
    // Verificar conexión cada 30 segundos
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Wifi className="h-4 w-4 text-gray-500 animate-pulse" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Conectado';
      case 'disconnected':
        return 'Desconectado';
      case 'error':
        return 'Error de conexión';
      default:
        return 'Verificando...';
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600';
      case 'disconnected':
        return 'text-red-600';
      case 'error':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  if (!user || !userData) {
    return null; // No mostrar si no hay usuario autenticado
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
      <div className="flex items-center space-x-2">
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${getStatusColor()} dark:text-white`}>
            {getStatusText()}
          </div>
          {lastCheck && (
            <div className="text-xs text-gray-500 dark:text-gray-300 truncate">
              Última verificación: {lastCheck.toLocaleTimeString()}
            </div>
          )}
        </div>
        <button
          onClick={checkConnection}
          disabled={connectionStatus === 'checking'}
          className="flex-shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
          title="Verificar conexión"
        >
          <RefreshCw className={`h-3 w-3 text-gray-600 dark:text-gray-300 ${connectionStatus === 'checking' ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};
