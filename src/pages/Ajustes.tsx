import React, { useState } from 'react';
import { 
  User, 
  Shield, 
  Crown, 
  Building, 
  Users, 
  ChevronRight,
  Activity,
  Zap,
  Star,
  CheckCircle
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { PlanManagement } from '../components/common/PlanManagement';
import { EmployeeManagement } from '../components/common/EmployeeManagement';
import { EditProfileModal } from '../components/common/EditProfileModal';
import { SecurityModal } from '../components/common/SecurityModal';

export const Ajustes: React.FC = () => {
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const { userData } = useAuthStore();

  // Mostrar loading mientras se cargan los datos
  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Cargando ajustes...</p>
        </div>
      </div>
    );
  }

  // Valores por defecto para evitar errores
  const currentPlan = userData?.plan || 'individual';
  const currentUserCount = userData?.tenantId ? 1 : 1; // Por ahora 1, pero se puede expandir

  // Determinar si mostrar gestión de empleados
  const showEmployeeManagement = currentPlan === 'business' || currentPlan === 'enterprise';

  // Obtener información del plan
  const getPlanInfo = (plan: string) => {
    switch (plan) {
      case 'individual':
        return {
          name: 'Individual',
          icon: <Users className="h-6 w-6 text-blue-500" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          price: 'Gratis',
          features: ['1 Usuario', 'Funciones básicas', 'Soporte por email'],
          userLimit: 1
        };
      case 'business':
        return {
          name: 'Business',
          icon: <Building className="h-6 w-6 text-green-500" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          price: '$29/mes',
          features: ['Hasta 11 usuarios', 'Gestión de empleados', 'Soporte prioritario'],
          userLimit: 11
        };
      case 'enterprise':
        return {
          name: 'Enterprise',
          icon: <Crown className="h-6 w-6 text-purple-500" />,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50 dark:bg-purple-900/20',
          borderColor: 'border-purple-200 dark:border-purple-800',
          price: '$99/mes',
          features: ['Usuarios ilimitados', 'Funciones avanzadas', 'Soporte 24/7'],
          userLimit: null
        };
      default:
        return {
          name: 'Individual',
          icon: <Users className="h-6 w-6 text-gray-500" />,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800',
          price: 'Gratis',
          features: ['1 Usuario', 'Funciones básicas', 'Soporte por email'],
          userLimit: 1
        };
    }
  };

  const planInfo = getPlanInfo(currentPlan);

  // Obtener información del rol
  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'owner':
        return {
          name: 'Propietario',
          description: 'Acceso completo a todas las funciones',
          icon: <Crown className="h-5 w-5 text-yellow-500" />,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20'
        };
      case 'admin':
        return {
          name: 'Administrador',
          description: 'Gestión completa de usuarios y datos',
          icon: <Shield className="h-5 w-5 text-blue-500" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20'
        };
      case 'manager':
        return {
          name: 'Manager',
          description: 'Gestión de operaciones diarias',
          icon: <Activity className="h-5 w-5 text-green-500" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-900/20'
        };
      default:
        return {
          name: 'Sodero',
          description: 'Acceso operativo básico',
          icon: <User className="h-5 w-5 text-gray-500" />,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20'
        };
    }
  };

  const roleInfo = getRoleInfo(userData.rol);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header con Breadcrumbs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span>Dashboard</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900 dark:text-white font-medium">Ajustes</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Ajustes de Cuenta
              </h1>
              <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                Gestiona tu perfil, seguridad y configuración
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${planInfo.bgColor} ${planInfo.borderColor} border`}>
                <div className="flex items-center space-x-2">
                  {planInfo.icon}
                  <span className={planInfo.color}>{planInfo.name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Sección de Gestión de Plan */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <Crown className="h-6 w-6 text-blue-600" />
                <span>Gestión de Plan</span>
              </h2>
            </div>
            <div className="p-6">
              <PlanManagement />
            </div>
          </div>

          {/* Sección de Gestión de Empleados */}
          {showEmployeeManagement && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <Users className="h-6 w-6 text-green-600" />
                  <span>Gestión de Empleados</span>
                </h2>
              </div>
              <div className="p-6">
                <EmployeeManagement />
              </div>
            </div>
          )}

          {/* Sección de Perfil y Seguridad */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Perfil */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <User className="h-6 w-6 text-blue-600" />
                  <span>Perfil de Usuario</span>
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {userData.nombre || 'Usuario'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {userData.email}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Gestiona tu información personal, datos de contacto y preferencias de cuenta.
                  </p>
                  <button 
                    onClick={() => setShowEditProfileModal(true)}
                    className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-[1.02] font-medium"
                  >
                    Editar Perfil
                  </button>
                </div>
              </div>
            </div>

            {/* Seguridad */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <Shield className="h-6 w-6 text-green-600" />
                  <span>Seguridad y Privacidad</span>
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <Shield className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Configuración de Seguridad
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Contraseñas, 2FA y notificaciones
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Protege tu cuenta con autenticación de dos factores y configuraciones de seguridad avanzadas.
                  </p>
                  <button 
                    onClick={() => setShowSecurityModal(true)}
                    className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-all duration-200 transform hover:scale-[1.02] font-medium"
                  >
                    Configurar Seguridad
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Información Detallada del Plan */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <Star className="h-6 w-6 text-purple-600" />
                <span>Detalles del Plan Actual</span>
              </h3>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Plan Actual */}
                <div className={`${planInfo.bgColor} ${planInfo.borderColor} rounded-xl p-6 border`}>
                  <div className="flex items-center space-x-3 mb-4">
                    {planInfo.icon}
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        Plan Actual
                      </h4>
                      <p className={`text-sm ${planInfo.color} font-medium`}>
                        {planInfo.name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Precio:</span>
                      <span className="font-semibold text-green-600 dark:text-green-400 text-lg">
                        {planInfo.price}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Usuarios:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {currentUserCount} / {planInfo.userLimit || '∞'}
                      </span>
                    </div>
                    {planInfo.userLimit && (
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((currentUserCount / planInfo.userLimit) * 100, 100)}%` }}
                        ></div>
                      </div>
                    )}
                    {planInfo.userLimit && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        {planInfo.userLimit === 1 ? 'Usuario único' : 
                         planInfo.userLimit === 11 ? 'Hasta 11 usuarios permitidos' : 
                         'Usuarios ilimitados'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Rol del Usuario */}
                <div className={`${roleInfo.bgColor} rounded-xl p-6 border border-gray-200 dark:border-gray-700`}>
                  <div className="flex items-center space-x-3 mb-4">
                    {roleInfo.icon}
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        Tu Rol
                      </h4>
                      <p className={`text-sm ${roleInfo.color} font-medium`}>
                        {roleInfo.name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {roleInfo.description}
                    </p>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Acceso verificado
                      </span>
                    </div>
                  </div>
                </div>

                {/* Estado de la Cuenta */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3 mb-4">
                    <Activity className="h-6 w-6 text-purple-500 dark:text-purple-400" />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        Estado de Cuenta
                      </h4>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full"></div>
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                          {userData.isActive !== false ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Miembro desde:</span>
                      <span className="font-medium text-sm text-gray-900 dark:text-white">
                        {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Última actividad: Hoy
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Características del Plan */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                  Características incluidas en tu plan:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {planInfo.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modales */}
      <EditProfileModal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
      />

      <SecurityModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
      />
    </div>
  );
};