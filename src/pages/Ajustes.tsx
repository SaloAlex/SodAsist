import React from 'react';
import { User, Shield, Crown, Building, Users } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { PlanManagement } from '../components/common/PlanManagement';
import { EmployeeManagement } from '../components/common/EmployeeManagement';

export const Ajustes: React.FC = () => {
  try {
    const { userData } = useAuthStore();
    
    // Debug: Log de valores
    console.log('🔍 Ajustes - Valores:', {
      userData: !!userData,
      plan: userData?.plan,
      email: userData?.email,
      tenantId: userData?.tenantId,
      rol: userData?.rol,
      uid: userData?.uid
    });

    // Debug: Log completo del userData
    console.log('🔍 Ajustes - userData completo:', userData);

    // Debug: Log de tipos
    console.log('🔍 Ajustes - Tipos:', {
      hasUserData: !!userData,
      userDataType: typeof userData,
      planType: typeof userData?.plan,
      tenantIdType: typeof userData?.tenantId
    });

    // Mostrar loading mientras se cargan los datos
    if (!userData) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Cargando ajustes...</p>
          </div>
        </div>
      );
    }

    // Valores por defecto para evitar errores
    const currentPlan = userData?.plan || 'individual';
    const currentUserCount = 1; // Valor por defecto
    const maxUsers = currentPlan === 'individual' ? 1 : currentPlan === 'business' ? 11 : null;

    // Determinar si mostrar gestión de empleados
    const showEmployeeManagement = currentPlan === 'business' || currentPlan === 'enterprise';

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Ajustes
          </h1>
        </div>

        {/* Sección de Gestión de Plan */}
        <PlanManagement />

        {/* Sección de Gestión de Empleados - Solo visible en planes Business y Enterprise */}
        {showEmployeeManagement && (
          <EmployeeManagement />
        )}

        {/* Sección de Perfil y Seguridad */}
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
        </div>

        {/* Información del Plan Actual */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <Crown className="h-8 w-8 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Información del Plan
            </h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Plan Actual */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Users className="h-6 w-6 text-blue-500" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Plan Actual
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {currentPlan === 'individual' ? 'Individual' : currentPlan === 'business' ? 'Business' : 'Enterprise'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Usuarios:</span>
                  <span className="font-medium">
                    {currentUserCount} / {maxUsers || '∞'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Precio:</span>
                  <span className="font-medium text-green-600">
                    {currentPlan === 'individual' ? 'Gratis' : currentPlan === 'business' ? '$29/mes' : '$99/mes'}
                  </span>
                </div>
              </div>
            </div>

            {/* Rol del Usuario */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Shield className="h-6 w-6 text-green-500" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Tu Rol
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {userData.rol === 'owner' ? 'Propietario' : 
                     userData.rol === 'admin' ? 'Administrador' : 
                     userData.rol === 'manager' ? 'Manager' : 'Sodero'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Permisos:</span>
                  <span className="font-medium">
                    {userData.rol === 'owner' ? 'Completos' : 
                     userData.rol === 'admin' ? 'Administrativos' : 
                     userData.rol === 'manager' ? 'Gestión' : 'Operativos'}
                  </span>
                </div>
              </div>
            </div>

            {/* Estado de la Cuenta */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Building className="h-6 w-6 text-purple-500" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Estado
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {userData.isActive !== false ? 'Activa' : 'Inactiva'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Miembro desde:</span>
                  <span className="font-medium">
                    {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('❌ Error en componente Ajustes:', error);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Error en el componente
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }
};