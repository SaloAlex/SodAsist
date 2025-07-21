import React, { useState } from 'react';
import {
  Clock,
  Package,
  Users,
  DollarSign,
  MapPin,
  Bell,
  TrendingUp,
  Calendar,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Activity {
  id: string;
  type: 'entrega' | 'cliente' | 'pago' | 'ruta' | 'sistema';
  title: string;
  description: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'error' | 'info';
  metadata?: {
    clienteId?: string;
    clienteNombre?: string;
    monto?: number;
    ubicacion?: string;
    [key: string]: string | number | boolean | Date | undefined;
  };
  actionLabel?: string;
  onAction?: () => void;
}

interface ActivityWidgetProps {
  activities?: Activity[];
  loading?: boolean;
  maxItems?: number;
  showFilters?: boolean;
  onRefresh?: () => void;
  onViewAll?: () => void;
}

export const ActivityWidget: React.FC<ActivityWidgetProps> = ({
  activities = [],
  loading = false,
  maxItems = 10,
  showFilters = true,
  onRefresh,
  onViewAll
}) => {
  const [filter, setFilter] = useState<'all' | 'entrega' | 'cliente' | 'pago' | 'sistema'>('all');
  const [visibleItems, setVisibleItems] = useState(5);

  // Actividades de ejemplo si no se proporcionan
  const defaultActivities: Activity[] = [
    {
      id: '1',
      type: 'entrega',
      title: 'Entrega completada',
      description: 'Entrega realizada a Cliente ABC - $250.00',
      timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 min ago
      status: 'success',
      metadata: {
        clienteNombre: 'Cliente ABC',
        monto: 250,
        ubicacion: 'Zona Centro'
      },
      actionLabel: 'Ver detalles',
      onAction: () => console.log('Ver entrega')
    },
    {
      id: '2',
      type: 'pago',
      title: 'Pago pendiente',
      description: 'Cliente XYZ tiene una factura vencida de $180.00',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      status: 'warning',
      metadata: {
        clienteNombre: 'Cliente XYZ',
        monto: 180
      },
      actionLabel: 'Gestionar',
      onAction: () => console.log('Gestionar pago')
    },
    {
      id: '3',
      type: 'cliente',
      title: 'Cliente nuevo registrado',
      description: 'Nuevo cliente "Empresa DEF" agregado al sistema',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
      status: 'info',
      metadata: {
        clienteNombre: 'Empresa DEF'
      }
    },
    {
      id: '4',
      type: 'ruta',
      title: 'Ruta optimizada',
      description: 'Ruta del día optimizada: 12 clientes, 45km',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
      status: 'success',
      metadata: {
        ubicacion: '12 clientes, 45km'
      }
    },
    {
      id: '5',
      type: 'sistema',
      title: 'Backup completado',
      description: 'Respaldo automático de datos completado exitosamente',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
      status: 'success'
    }
  ];

  const activityData = activities.length > 0 ? activities : defaultActivities;

  // Filtrar actividades
  const filteredActivities = activityData.filter(activity => 
    filter === 'all' || activity.type === filter
  ).slice(0, maxItems);

  // Iconos por tipo de actividad
  const getActivityIcon = (type: Activity['type'], status: Activity['status']) => {
    const iconProps = {
      className: `h-4 w-4 ${
        status === 'success' ? 'text-green-600' :
        status === 'warning' ? 'text-yellow-600' :
        status === 'error' ? 'text-red-600' :
        'text-blue-600'
      }`
    };

    switch (type) {
      case 'entrega':
        return <Package {...iconProps} />;
      case 'cliente':
        return <Users {...iconProps} />;
      case 'pago':
        return <DollarSign {...iconProps} />;
      case 'ruta':
        return <MapPin {...iconProps} />;
      case 'sistema':
        return <Bell {...iconProps} />;
      default:
        return <Clock {...iconProps} />;
    }
  };

  // Color del indicador por status
  const getStatusColor = (status: Activity['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'info':
      default:
        return 'bg-blue-500';
    }
  };

  // Filtros disponibles
  const filters = [
    { key: 'all', label: 'Todo', icon: Clock },
    { key: 'entrega', label: 'Entregas', icon: Package },
    { key: 'cliente', label: 'Clientes', icon: Users },
    { key: 'pago', label: 'Pagos', icon: DollarSign },
    { key: 'sistema', label: 'Sistema', icon: Bell }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
            Actividad Reciente
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Últimas actualizaciones del sistema
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Actualizar actividad"
            >
              <TrendingUp className={`h-4 w-4 ${loading ? 'animate-pulse' : ''}`} />
            </button>
          )}
          
          <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="px-6 pb-4">
          <div className="flex items-center space-x-2 overflow-x-auto">
            {filters.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                                 onClick={() => setFilter(key as typeof filter)}
                className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  filter === key
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="h-3 w-3 mr-1.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timeline de actividades */}
      <div className="px-6 pb-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              No hay actividad reciente
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Las actividades aparecerán aquí cuando ocurran eventos
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredActivities.slice(0, visibleItems).map((activity, index) => (
              <div
                key={activity.id}
                className="flex items-start space-x-3 group hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg p-2 -m-2 transition-colors"
              >
                {/* Timeline dot */}
                <div className="relative flex-shrink-0">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(activity.status)} mt-2`}></div>
                  {index < filteredActivities.slice(0, visibleItems).length - 1 && (
                    <div className="absolute top-4 left-1 w-0.5 h-8 bg-gray-200 dark:bg-gray-600"></div>
                  )}
                </div>

                {/* Icono */}
                <div className="flex-shrink-0 mt-1">
                  <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    {getActivityIcon(activity.type, activity.status)}
                  </div>
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {activity.description}
                      </p>
                      
                      {/* Metadata */}
                      {activity.metadata && (
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {activity.metadata.clienteNombre && (
                            <span className="flex items-center">
                              <Users className="h-3 w-3 mr-1" />
                              {activity.metadata.clienteNombre}
                            </span>
                          )}
                          {activity.metadata.monto && (
                            <span className="flex items-center">
                              <DollarSign className="h-3 w-3 mr-1" />
                              ${activity.metadata.monto.toFixed(2)}
                            </span>
                          )}
                          {activity.metadata.ubicacion && (
                            <span className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {activity.metadata.ubicacion}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Timestamp y acciones */}
                    <div className="flex items-center space-x-2 ml-4">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(activity.timestamp, { 
                          addSuffix: true, 
                          locale: es 
                        })}
                      </span>
                      
                      {activity.onAction && activity.actionLabel && (
                        <button
                          onClick={activity.onAction}
                          className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-all"
                        >
                          {activity.actionLabel}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Ver más / Ver menos */}
            {filteredActivities.length > 5 && (
              <div className="flex items-center justify-center pt-4">
                {visibleItems < filteredActivities.length ? (
                  <button
                    onClick={() => setVisibleItems(Math.min(visibleItems + 5, filteredActivities.length))}
                    className="flex items-center px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver más ({filteredActivities.length - visibleItems} restantes)
                  </button>
                ) : (
                  <button
                    onClick={() => setVisibleItems(5)}
                    className="flex items-center px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Ver menos
                  </button>
                )}
              </div>
            )}

            {/* Ver todo */}
            {onViewAll && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={onViewAll}
                  className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Ver toda la actividad
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 