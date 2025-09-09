import React from 'react';
import { Truck, Package, Users, ArrowRight, AlertCircle } from 'lucide-react';

interface EmptyDeliveryStateProps {
  onCreateProduct: () => void;
  onCreateClient: () => void;
  hasProducts: boolean;
  hasClients: boolean;
}

export const EmptyDeliveryState: React.FC<EmptyDeliveryStateProps> = ({
  onCreateProduct,
  onCreateClient,
  hasProducts,
  hasClients
}) => {
  const getMessage = () => {
    if (!hasProducts && !hasClients) {
      return {
        title: "¡Necesitas productos y clientes para hacer entregas!",
        description: "Para registrar entregas, primero debes cargar tus productos y clientes.",
        icon: <AlertCircle className="h-12 w-12 text-amber-500" />,
        color: "amber"
      };
    } else if (!hasProducts) {
      return {
        title: "¡Necesitas productos para hacer entregas!",
        description: "Carga tus productos primero para poder registrar entregas.",
        icon: <Package className="h-12 w-12 text-blue-500" />,
        color: "blue"
      };
    } else if (!hasClients) {
      return {
        title: "¡Necesitas clientes para hacer entregas!",
        description: "Registra tus clientes primero para poder hacer entregas.",
        icon: <Users className="h-12 w-12 text-green-500" />,
        color: "green"
      };
    }
    return null;
  };

  const message = getMessage();

  if (!message) return null;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Icono principal */}
      <div className="mb-6">
        <div className={`mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-${message.color}-100 dark:bg-${message.color}-900`}>
          {message.icon}
        </div>
      </div>

      {/* Título y descripción */}
      <div className="mb-8 max-w-md">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {message.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {message.description}
        </p>
      </div>

      {/* Estado actual */}
      <div className="mb-8 w-full max-w-md">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className={`flex items-center justify-center p-3 rounded-lg ${
            hasProducts 
              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
          }`}>
            <Package className="h-4 w-4 mr-2" />
            <span className="font-medium">
              {hasProducts ? 'Productos ✓' : 'Sin productos'}
            </span>
          </div>
          
          <div className={`flex items-center justify-center p-3 rounded-lg ${
            hasClients 
              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
          }`}>
            <Users className="h-4 w-4 mr-2" />
            <span className="font-medium">
              {hasClients ? 'Clientes ✓' : 'Sin clientes'}
            </span>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        {!hasProducts && (
          <button
            onClick={onCreateProduct}
            className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Package className="h-5 w-5 mr-2" />
            Cargar productos
            <ArrowRight className="h-4 w-4 ml-2" />
          </button>
        )}
        
        {!hasClients && (
          <button
            onClick={onCreateClient}
            className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <Users className="h-5 w-5 mr-2" />
            Registrar clientes
            <ArrowRight className="h-4 w-4 ml-2" />
          </button>
        )}
      </div>

      {/* Información adicional */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg max-w-md">
        <div className="flex items-start">
          <Truck className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-left">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              ¿Qué puedes hacer con las entregas?
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Registrar entregas con productos y cantidades</li>
              <li>• Controlar pagos y saldos pendientes</li>
              <li>• Generar reportes de ventas</li>
              <li>• Optimizar rutas de entrega</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
