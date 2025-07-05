import React from 'react';
import { BarChart3, TrendingUp, DollarSign, Users } from 'lucide-react';

export const Reportes: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Reportes
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-4">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Ventas Mensuales
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Análisis de ventas por mes y comparación con períodos anteriores.
          </p>
          <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Ver Reporte
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Tendencias
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Análisis de tendencias de ventas y crecimiento del negocio.
          </p>
          <button className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
            Ver Reporte
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-4">
            <DollarSign className="h-8 w-8 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Cobranzas
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Estado de cobranzas y cuentas por cobrar.
          </p>
          <button className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors">
            Ver Reporte
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Users className="h-8 w-8 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Clientes
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Análisis de clientes, frecuencia de compras y segmentación.
          </p>
          <button className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
            Ver Reporte
          </button>
        </div>
      </div>
    </div>
  );
};