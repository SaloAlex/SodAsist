import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  Info,
  CheckCircle,
  X,
  Clock,
  DollarSign,
  Users,
  Package,
  Settings,
  MoreHorizontal
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Notification {
  id: string;
  type: 'alert' | 'info' | 'success' | 'warning';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  timestamp: Date;
  category: 'sistema' | 'entrega' | 'cliente' | 'pago' | 'inventario';
  actionLabel?: string;
  onAction?: () => void;
  dismissible?: boolean;
  metadata?: {
    [key: string]: string | number | boolean;
  };
}

interface NotificationsWidgetProps {
  notifications?: Notification[];
  loading?: boolean;
  onDismiss?: (id: string) => void;
  onDismissAll?: () => void;
  onMarkAllRead?: () => void;
  showFilters?: boolean;
  maxItems?: number;
}

export const NotificationsWidget: React.FC<NotificationsWidgetProps> = ({
  notifications = [],
  loading = false,
  onDismiss,
  onDismissAll,
  onMarkAllRead,
  showFilters = true,
  maxItems = 8
}) => {
  const [filter, setFilter] = useState<'all' | 'alert' | 'info' | 'success' | 'warning'>('all');

  // Notificaciones de ejemplo
  const defaultNotifications: Notification[] = [
    {
      id: '1',
      type: 'alert',
      priority: 'urgent',
      title: 'Pago vencido',
      message: 'Cliente "Empresa ABC" tiene una factura vencida de $1,250.00 desde hace 15 días',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
      category: 'pago',
      actionLabel: 'Gestionar',
      onAction: () => console.log('Gestionar pago vencido'),
      dismissible: true,
      metadata: { clienteId: '123', monto: 1250 }
    },
    {
      id: '2',
      type: 'warning',
      priority: 'high',
      title: 'Stock bajo',
      message: 'Quedan menos de 10 bidones de 20L en inventario',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1), // 1 hour ago
      category: 'inventario',
      actionLabel: 'Ver inventario',
      onAction: () => console.log('Ver inventario'),
      dismissible: true
    },
    {
      id: '3',
      type: 'info',
      priority: 'medium',
      title: 'Nueva ruta optimizada',
      message: 'Se ha generado una nueva ruta para mañana con 15 clientes',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      category: 'entrega',
      actionLabel: 'Ver ruta',
      onAction: () => console.log('Ver ruta'),
      dismissible: true
    },
    {
      id: '4',
      type: 'success',
      priority: 'low',
      title: 'Backup completado',
      message: 'Respaldo automático de datos completado exitosamente a las 03:00',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
      category: 'sistema',
      dismissible: true
    },
    {
      id: '5',
      type: 'info',
      priority: 'medium',
      title: 'Cliente nuevo',
      message: 'Se registró un nuevo cliente: "Restaurante XYZ" en Zona Norte',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
      category: 'cliente',
      actionLabel: 'Ver cliente',
      onAction: () => console.log('Ver cliente'),
      dismissible: true
    }
  ];

  const notificationData = notifications.length > 0 ? notifications : defaultNotifications;

  // Filtrar notificaciones
  const filteredNotifications = notificationData
    .filter(notif => filter === 'all' || notif.type === filter)
    .slice(0, maxItems);

  // Contar notificaciones por prioridad
  const priorityCounts = {
    urgent: notificationData.filter(n => n.priority === 'urgent').length,
    high: notificationData.filter(n => n.priority === 'high').length,
    medium: notificationData.filter(n => n.priority === 'medium').length,
    low: notificationData.filter(n => n.priority === 'low').length
  };

  // Obtener icono por tipo
  const getTypeIcon = (type: Notification['type']) => {
    const iconProps = { className: 'h-4 w-4' };
    switch (type) {
      case 'alert':
        return <AlertTriangle {...iconProps} className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle {...iconProps} className="h-4 w-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle {...iconProps} className="h-4 w-4 text-green-500" />;
      case 'info':
      default:
        return <Info {...iconProps} className="h-4 w-4 text-blue-500" />;
    }
  };

  // Obtener icono por categoría
  const getCategoryIcon = (category: Notification['category']) => {
    const iconProps = { className: 'h-3 w-3' };
    switch (category) {
      case 'entrega':
        return <Package {...iconProps} />;
      case 'cliente':
        return <Users {...iconProps} />;
      case 'pago':
        return <DollarSign {...iconProps} />;
      case 'inventario':
        return <Package {...iconProps} />;
      case 'sistema':
      default:
        return <Settings {...iconProps} />;
    }
  };

  // Obtener color por prioridad
  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/10';
      case 'high':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/10';
      case 'medium':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10';
      case 'low':
      default:
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/10';
    }
  };

  // Filtros de tipo
  const typeFilters = [
    { key: 'all', label: 'Todo', count: notificationData.length },
    { key: 'alert', label: 'Alertas', count: notificationData.filter(n => n.type === 'alert').length },
    { key: 'warning', label: 'Avisos', count: notificationData.filter(n => n.type === 'warning').length },
    { key: 'info', label: 'Info', count: notificationData.filter(n => n.type === 'info').length }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
            Notificaciones
            {priorityCounts.urgent > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full">
                {priorityCounts.urgent} urgente{priorityCounts.urgent > 1 ? 's' : ''}
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {notificationData.length} notificación{notificationData.length !== 1 ? 'es' : ''} total{notificationData.length !== 1 ? 'es' : ''}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {onMarkAllRead && (
            <button
              onClick={onMarkAllRead}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              Marcar como leídas
            </button>
          )}
          
          {onDismissAll && notificationData.length > 0 && (
            <button
              onClick={onDismissAll}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Descartar todas
            </button>
          )}

          <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Resumen de prioridades */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-lg font-bold text-red-600 dark:text-red-400">{priorityCounts.urgent}</p>
            <p className="text-xs text-red-600 dark:text-red-400">Urgente</p>
          </div>
          <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{priorityCounts.high}</p>
            <p className="text-xs text-orange-600 dark:text-orange-400">Alta</p>
          </div>
          <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{priorityCounts.medium}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">Media</p>
          </div>
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
            <p className="text-lg font-bold text-gray-600 dark:text-gray-400">{priorityCounts.low}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Baja</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="px-6 pb-4">
          <div className="flex items-center space-x-2 overflow-x-auto">
            {typeFilters.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key as typeof filter)}
                className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  filter === key
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {label}
                {count > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded-full">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lista de notificaciones */}
      <div className="px-6 pb-6">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start space-x-3 p-3 border-l-4 border-gray-200 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              No hay notificaciones
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Las notificaciones aparecerán aquí cuando ocurran eventos importantes
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`border-l-4 rounded-lg p-3 transition-all hover:shadow-sm ${getPriorityColor(notification.priority)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {/* Icono de tipo */}
                    <div className="flex-shrink-0 mt-0.5">
                      {getTypeIcon(notification.type)}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-1">
                          {getCategoryIcon(notification.category)}
                          <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            {notification.category}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDistanceToNow(notification.timestamp, { 
                            addSuffix: true, 
                            locale: es 
                          })}
                        </span>
                        
                        <div className="flex items-center space-x-2">
                          {notification.onAction && notification.actionLabel && (
                            <button
                              onClick={notification.onAction}
                              className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                            >
                              {notification.actionLabel}
                            </button>
                          )}
                          
                          {notification.dismissible && onDismiss && (
                            <button
                              onClick={() => onDismiss(notification.id)}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
                              title="Descartar notificación"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
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