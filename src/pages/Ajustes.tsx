import React from 'react';
import { User, Shield, Database, Bell } from 'lucide-react';

export const Ajustes: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Ajustes
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-4">
            <User className="h-8 w-8 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Perfil
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Gestiona tu información personal y configuración de cuenta.
          </p>
          <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Editar Perfil
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="h-8 w-8 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Seguridad
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Configura contraseñas y opciones de seguridad.
          </p>
          <button className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
            Configurar
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Database className="h-8 w-8 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Datos
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Exporta, importa y gestiona tus datos.
          </p>
          <button className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
            Gestionar Datos
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Bell className="h-8 w-8 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Notificaciones
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Configura alertas y notificaciones del sistema.
          </p>
          <button className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors">
            Configurar
          </button>
        </div>
      </div>
    </div>
  );
};