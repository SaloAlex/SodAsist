import React from 'react';
import { Package, Plus, ArrowRight, Lightbulb } from 'lucide-react';

interface EmptyInventoryStateProps {
  onCreateProduct: () => void;
  onLoadSampleData?: () => void;
  showSampleDataOption?: boolean;
}

export const EmptyInventoryState: React.FC<EmptyInventoryStateProps> = ({
  onCreateProduct,
  onLoadSampleData,
  showSampleDataOption = false
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Icono principal */}
      <div className="mb-6">
        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-blue-100 dark:bg-blue-900">
          <Package className="h-10 w-10 text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      {/* Título y descripción */}
      <div className="mb-8 max-w-md">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          ¡Comienza cargando tu inventario!
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Para empezar a usar el sistema, necesitas cargar tus productos. 
          Esto te permitirá gestionar entregas, controlar stock y mucho más.
        </p>
      </div>

      {/* Pasos del proceso */}
      <div className="mb-8 w-full max-w-lg">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 mb-2">
              <span className="text-blue-600 dark:text-blue-400 font-semibold">1</span>
            </div>
            <span className="text-gray-700 dark:text-gray-300 font-medium">Cargar Productos</span>
            <span className="text-gray-500 dark:text-gray-400 text-xs mt-1">Agrega tus productos con precios y stock</span>
          </div>
          
          <div className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 mb-2">
              <span className="text-green-600 dark:text-green-400 font-semibold">2</span>
            </div>
            <span className="text-gray-700 dark:text-gray-300 font-medium">Gestionar Clientes</span>
            <span className="text-gray-500 dark:text-gray-400 text-xs mt-1">Registra tus clientes y sus datos</span>
          </div>
          
          <div className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 mb-2">
              <span className="text-purple-600 dark:text-purple-400 font-semibold">3</span>
            </div>
            <span className="text-gray-700 dark:text-gray-300 font-medium">Hacer Entregas</span>
            <span className="text-gray-500 dark:text-gray-400 text-xs mt-1">Registra entregas y controla tu negocio</span>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        <button
          onClick={onCreateProduct}
          className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="h-5 w-5 mr-2" />
          Cargar mi primer producto
          <ArrowRight className="h-4 w-4 ml-2" />
        </button>
        
        {showSampleDataOption && onLoadSampleData && (
          <button
            onClick={onLoadSampleData}
            className="flex items-center justify-center px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            <Lightbulb className="h-5 w-5 mr-2" />
            Ver datos de ejemplo
          </button>
        )}
      </div>

      {/* Consejos adicionales */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg max-w-md">
        <div className="flex items-start">
          <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-left">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
              Consejo para empezar
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Comienza cargando tus productos más importantes. Puedes agregar más productos 
              y categorías en cualquier momento desde el menú de inventario.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
