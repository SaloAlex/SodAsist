import React, { useState } from 'react';
import { 
  Crown, 
  Building, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight,
  Check,
  AlertTriangle,
  Info
} from 'lucide-react';
import { PlanManagementService } from '../../services/planManagementService';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export const PlanManagement: React.FC = () => {
  const { userData, setUserData } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showUpgradeOptions, setShowUpgradeOptions] = useState(false);
  const [showDowngradeOptions, setShowDowngradeOptions] = useState(false);

  const currentPlan = userData?.plan || 'individual';
  const canUpgrade = PlanManagementService.canUpgrade(currentPlan);
  const canDowngrade = PlanManagementService.canDowngrade(currentPlan);

  const handlePlanChange = async (newPlan: 'individual' | 'business' | 'enterprise') => {
    console.log('🔄 Iniciando cambio de plan:', { 
      newPlan, 
      currentPlan, 
      userData: userData ? {
        uid: userData.uid,
        email: userData.email,
        tenantId: userData.tenantId,
        plan: userData.plan
      } : null
    });
    
    // Validar que no se esté intentando cambiar al mismo plan
    if (newPlan === currentPlan) {
      toast.error(`Ya tienes el plan ${newPlan}. No se puede cambiar al mismo plan.`);
      console.warn('⚠️ Intento de cambio al mismo plan:', { currentPlan, newPlan });
      return;
    }
    
    if (!userData?.tenantId) {
      toast.error('No se pudo identificar el tenant');
      console.error('❌ TenantId no encontrado en userData:', userData);
      return;
    }

    setIsLoading(true);
    try {
      const reason = newPlan === 'individual' ? 'manual_downgrade' : 'manual_upgrade';
      console.log('📞 Llamando a PlanManagementService.changePlan con:', {
        tenantId: userData.tenantId,
        newPlan,
        reason
      });
      
      const success = await PlanManagementService.changePlan(userData.tenantId, newPlan, reason);
      
             if (success) {
         // Actualizar el estado local del usuario
         console.log('✅ Plan cambiado exitosamente, actualizando estado local...');
         
         // Actualizar el store local con el nuevo plan
         if (userData) {
           const updatedUserData = {
             ...userData,
             plan: newPlan,
             updatedAt: new Date()
           };
           
           console.log('🔄 Actualizando store local:', {
             fromPlan: userData.plan,
             toPlan: newPlan
           });
           
           setUserData(updatedUserData);
           
           toast.success(`Plan actualizado a ${newPlan} en tu perfil`);
           console.log('✅ Store local actualizado correctamente');
         }
         
         // Recargar la página para asegurar sincronización completa
         setTimeout(() => {
           window.location.reload();
         }, 1000);
       }
    } catch (error) {
      console.error('Error cambiando plan:', error);
      toast.error(`Error al cambiar plan: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'individual': return <Users className="h-6 w-6 text-gray-600" />;
      case 'business': return <Building className="h-6 w-6 text-blue-600" />;
      case 'enterprise': return <Crown className="h-6 w-6 text-purple-600" />;
      default: return <Users className="h-6 w-6 text-gray-600" />;
    }
  };

  const getPlanName = (plan: string) => {
    switch (plan) {
      case 'individual': return 'Plan Individual';
      case 'business': return 'Plan Business';
      case 'enterprise': return 'Plan Enterprise';
      default: return plan;
    }
  };

  const getPlanPrice = (plan: string) => {
    switch (plan) {
      case 'individual': return 'Gratis';
      case 'business': return '$29/mes';
      case 'enterprise': return '$99/mes';
      default: return 'N/A';
    }
  };

  const getMaxUsers = (plan: string) => {
    switch (plan) {
      case 'individual': return 1;
      case 'business': return 11;
      case 'enterprise': return null; // Ilimitado
      default: return 1;
    }
  };

  const getPlanFeatures = (plan: string) => {
    switch (plan) {
      case 'individual':
        return [
          '1 usuario',
          'Gestión básica de clientes',
          'Optimización de rutas',
          'Reportes básicos'
        ];
      case 'business':
        return [
          'Hasta 10 empleados',
          'Gestión de roles',
          'Reportes avanzados',
          'Soporte prioritario'
        ];
      case 'enterprise':
        return [
          'Usuarios ilimitados',
          'Todas las funcionalidades',
          'Soporte 24/7',
          'API personalizada'
        ];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Crown className="h-8 w-8 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Gestión de Plan
        </h3>
      </div>

      {/* Current Plan Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getPlanIcon(currentPlan)}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                {getPlanName(currentPlan)}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Plan actual
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {getPlanPrice(currentPlan)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {getMaxUsers(currentPlan) ? `Hasta ${getMaxUsers(currentPlan)} usuarios` : 'Usuarios ilimitados'}
            </div>
          </div>
        </div>

        {/* Plan Features */}
        <div className="mb-6">
          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Características incluidas:
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {getPlanFeatures(currentPlan).map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {canUpgrade && (
            <button
              onClick={() => setShowUpgradeOptions(true)}
              disabled={isLoading}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Mejorar Plan
            </button>
          )}
          
          {canDowngrade && (
            <button
              onClick={() => setShowDowngradeOptions(true)}
              disabled={isLoading}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <ArrowDownRight className="h-4 w-4 mr-2" />
              Cambiar a Plan Menor
            </button>
          )}
        </div>

        {/* Info Message */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">Información importante:</p>
              <ul className="mt-1 space-y-1">
                <li>• Los cambios de plan se aplican inmediatamente</li>
                <li>• Al hacer downgrade, se mantienen los datos existentes</li>
                <li>• Los empleados excedidos se marcarán como inactivos</li>
              </ul>
            </div>
          </div>
        </div>
        

      </div>

      {/* Upgrade Options Modal */}
      {showUpgradeOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Mejorar tu Plan
                </h3>
                <button
                  onClick={() => setShowUpgradeOptions(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {PlanManagementService.getAvailableUpgrades(currentPlan).map((upgrade) => (
                  <div
                    key={upgrade.plan}
                    className="border-2 border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getPlanIcon(upgrade.plan)}
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {upgrade.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {upgrade.maxUsers ? `Hasta ${upgrade.maxUsers} usuarios` : 'Usuarios ilimitados'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {upgrade.price}
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nuevas características:
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {upgrade.features.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        handlePlanChange(upgrade.plan);
                        setShowUpgradeOptions(false);
                      }}
                      disabled={isLoading}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <ArrowUpRight className="h-4 w-4 mr-2" />
                          Cambiar a {upgrade.name}
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Downgrade Options Modal */}
      {showDowngradeOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Cambiar a Plan Menor
                </h3>
                <button
                  onClick={() => setShowDowngradeOptions(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium">⚠️ Advertencia:</p>
                    <p>Al hacer downgrade, perderás acceso a funcionalidades avanzadas y podrías afectar a tu equipo.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {PlanManagementService.getAvailableDowngrades(currentPlan).map((downgrade) => (
                  <div
                    key={downgrade.plan}
                    className="border-2 border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:border-red-300 dark:hover:border-red-600 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getPlanIcon(downgrade.plan)}
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {downgrade.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Hasta {downgrade.maxUsers} usuario{downgrade.maxUsers !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {downgrade.price}
                        </div>
                      </div>
                    </div>

                    {downgrade.warning && (
                      <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-800 dark:text-red-200">
                          <strong>Pérdida:</strong> {downgrade.warning}
                        </p>
                      </div>
                    )}

                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Características del plan:
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {downgrade.features.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        handlePlanChange(downgrade.plan);
                        setShowDowngradeOptions(false);
                      }}
                      disabled={isLoading}
                      className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <ArrowDownRight className="h-4 w-4 mr-2" />
                          Cambiar a {downgrade.name}
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
