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
  MoreHorizontal,
  RefreshCw,
  Plus
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNotifications } from '../../hooks/useNotifications';

// Usar la interfaz del servicio de notificaciones
import { SystemNotification } from '../../services/notificationService';

interface NotificationsWidgetProps {
  showFilters?: boolean;
  maxItems?: number;
  showCreateSample?: boolean; // Para testing
}

export const NotificationsWidget: React.FC<NotificationsWidgetProps> = ({
  showFilters = true,
  maxItems = 8,
  showCreateSample = false
}) => {
  const [filter, setFilter] = useState<'all' | 'alert' | 'info' | 'success' | 'warning'>('all');
  
  // Usar el hook de notificaciones
  const {
    notifications,
    loading,
    counts,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refreshNotifications,
    createSampleNotifications
  } = useNotifications();

  // Usar notificaciones reales del hook
  const notificationData = notifications;

  // Filtrar notificaciones
  const filteredNotifications = notificationData
    .filter(notif => filter === 'all' || notif.type === filter)
    .slice(0, maxItems);

  // Usar contadores del hook
  const priorityCounts = counts.byPriority;

  // Obtener icono por tipo
  const getTypeIcon = (type: SystemNotification['type']) => {
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
  const getCategoryIcon = (category: SystemNotification['category']) => {
    const iconProps = { className: 'h-3 w-3 text-gray-500 dark:text-gray-300' };
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
  const getPriorityColor = (priority: SystemNotification['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-600 bg-red-50/80 dark:bg-red-900/20';
      case 'high':
        return 'border-l-orange-500 bg-orange-50/80 dark:bg-orange-900/20';
      case 'medium':
        return 'border-l-blue-500 bg-blue-50/80 dark:bg-blue-900/20';
      case 'low':
      default:
        return 'border-l-gray-400 bg-gray-50/80 dark:bg-gray-800/50';
    }
  };

  // Filtros de tipo usando contadores del hook
  const typeFilters = [
    { key: 'all', label: 'Todo', count: counts.total },
    { key: 'alert', label: 'Alertas', count: counts.byType.alert },
    { key: 'warning', label: 'Avisos', count: counts.byType.warning },
    { key: 'info', label: 'Info', count: counts.byType.info }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4">
        <div>
                     <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
             <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
             Notificaciones
           </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {notificationData.length} notificación{notificationData.length !== 1 ? 'es' : ''} total{notificationData.length !== 1 ? 'es' : ''}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {showCreateSample && (
            <button
              onClick={createSampleNotifications}
              className="px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors duration-200"
              title="Crear notificaciones de ejemplo"
            >
              <Plus className="h-3 w-3 mr-1 inline" />
              Ejemplo
            </button>
          )}
          
          <button
            onClick={refreshNotifications}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            title="Actualizar notificaciones"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {counts.unread > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200"
            >
              Marcar como leídas
            </button>
          )}
          
          {notificationData.length > 0 && (
            <button
              onClick={deleteAllNotifications}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
            >
              Descartar todas
            </button>
          )}

          <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

             {/* Resumen de prioridades */}
       <div className="px-6 pb-4">
         <div className="grid grid-cols-4 gap-3">
           <div className="text-center p-2 bg-red-50/80 dark:bg-red-900/30 rounded-lg border border-red-100 dark:border-red-800/50">
             <p className="text-lg font-bold text-red-700 dark:text-red-300">{priorityCounts.urgent}</p>
             <p className="text-xs text-red-600 dark:text-red-400">Urgente</p>
           </div>
           <div className="text-center p-2 bg-orange-50/80 dark:bg-orange-900/30 rounded-lg border border-orange-100 dark:border-orange-800/50">
             <p className="text-lg font-bold text-orange-700 dark:text-orange-300">{priorityCounts.high}</p>
             <p className="text-xs text-orange-600 dark:text-orange-400">Alta</p>
           </div>
           <div className="text-center p-2 bg-blue-50/80 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800/50">
             <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{priorityCounts.medium}</p>
             <p className="text-xs text-blue-600 dark:text-blue-400">Media</p>
           </div>
           <div className="text-center p-2 bg-gray-50/80 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50">
             <p className="text-lg font-bold text-gray-700 dark:text-gray-300">{priorityCounts.low}</p>
             <p className="text-xs text-gray-600 dark:text-gray-400">Baja</p>
           </div>
         </div>
       </div>

      {/* Filtros */}
      {showFilters && (
        <div className="px-6 pb-4">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            {typeFilters.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key as typeof filter)}
                className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap min-w-fit ${
                  filter === key
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 shadow-sm'
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
                className={`border-l-4 rounded-lg p-3 transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${getPriorityColor(notification.priority)}`}
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
                          {formatDistanceToNow(notification.createdAt, { 
                            addSuffix: true, 
                            locale: es 
                          })}
                        </span>
                        
                        <div className="flex items-center space-x-2">
                          {notification.actionLabel && notification.actionUrl && (
                            <button
                              onClick={() => {
                                // Navegar a la URL de acción
                                window.location.href = notification.actionUrl!;
                              }}
                              className="px-3 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-all duration-200 shadow-sm"
                            >
                              {notification.actionLabel}
                            </button>
                          )}
                          
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id!)}
                              className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-all duration-200"
                              title="Marcar como leída"
                            >
                              ✓
                            </button>
                          )}
                          
                          {notification.dismissible && (
                            <button
                              onClick={() => deleteNotification(notification.id!)}
                              className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
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