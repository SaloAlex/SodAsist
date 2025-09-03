import React, { useState } from 'react';
import { X, Check, Crown, Building, Users, Star, CreditCard, Shield, Zap } from 'lucide-react';
import { getUpgradeOptions, calculateUpgradePrice, AVAILABLE_PLANS } from '../../services/plansService';
import { TenantManagementService } from '../../services/tenantManagementService';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface UpgradePlanModalProps {
  currentPlan: string;
  onClose: () => void;
}

export const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({ 
  currentPlan, 
  onClose 
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { userData } = useAuthStore();
  
  const upgradeOptions = getUpgradeOptions(currentPlan);
  const currentPlanData = AVAILABLE_PLANS.find(plan => plan.id === currentPlan);

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'individual':
        return <Users className="h-6 w-6 text-blue-500" />;
      case 'business':
        return <Building className="h-6 w-6 text-green-500" />;
      case 'enterprise':
        return <Crown className="h-6 w-6 text-purple-500" />;
      default:
        return <Users className="h-6 w-6 text-gray-500" />;
    }
  };

  const getFeatureIcon = (feature: string) => {
    if (feature.includes('Soporte')) return <Shield className="h-4 w-4 text-green-500" />;
    if (feature.includes('API')) return <Zap className="h-4 w-4 text-blue-500" />;
    if (feature.includes('Personalización')) return <Star className="h-4 w-4 text-yellow-500" />;
    return <Check className="h-4 w-4 text-green-500" />;
  };

  const handleUpgrade = async () => {
    if (!selectedPlan || !userData?.tenantId) {
      toast.error('Por favor selecciona un plan y asegúrate de estar autenticado');
      return;
    }

    setLoading(true);
    try {
      // Realizar el upgrade usando el servicio
      await TenantManagementService.updateTenantPlan({
        tenantId: userData.tenantId,
        newPlan: selectedPlan as 'individual' | 'business' | 'enterprise',
        reason: 'manual_upgrade'
      });
      
      toast.success(`¡Upgrade exitoso al plan ${selectedPlan}!`);
      onClose();
      
      // Recargar la página para reflejar los cambios
      window.location.reload();
      
    } catch (error) {
      console.error('Error during upgrade:', error);
      toast.error('Error durante el upgrade. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelection = (planId: string) => {
    setSelectedPlan(planId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Upgrade de Plan</h2>
            <p className="text-gray-600 mt-1">
              Selecciona el plan que mejor se adapte a tus necesidades
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Plan Actual */}
        {currentPlanData && (
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              {getPlanIcon(currentPlanData.id)}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Plan Actual: {currentPlanData.name}
                </h3>
                <p className="text-gray-600">
                  {currentPlanData.description}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Opciones de Upgrade */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Planes Disponibles para Upgrade
          </h3>
          
          <div className="grid gap-6 md:grid-cols-2">
            {upgradeOptions.map((option) => (
              <div
                key={option.planId}
                className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                  selectedPlan === option.planId
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handlePlanSelection(option.planId)}
              >
                {/* Plan Header */}
                <div className="text-center mb-4">
                  <div className="flex justify-center mb-3">
                    {getPlanIcon(option.planId)}
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">{option.name}</h4>
                  <div className="text-3xl font-bold text-blue-600 mt-2">
                    {option.price}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {option.maxUsers ? `Hasta ${option.maxUsers} usuarios` : 'Usuarios ilimitados'}
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-900">Características incluidas:</h5>
                  <ul className="space-y-2">
                    {option.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        {getFeatureIcon(feature)}
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Selección */}
                <div className="mt-4 text-center">
                  <div className={`w-4 h-4 rounded-full border-2 mx-auto ${
                    selectedPlan === option.planId
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedPlan === option.planId && (
                      <div className="w-2 h-2 bg-white rounded-full m-auto" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comparación de Precios */}
        {selectedPlan && (
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <div className="text-center">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Resumen del Upgrade
              </h4>
              <div className="text-2xl font-bold text-green-600">
                {calculateUpgradePrice(currentPlan, selectedPlan)}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Precio mensual del nuevo plan
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancelar
          </button>
          
          <div className="flex space-x-3">
            <button className="px-4 py-2 text-blue-600 underline hover:text-blue-800 transition-colors">
              Contactar Soporte
            </button>
            
            <button
              onClick={handleUpgrade}
              disabled={!selectedPlan || loading}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                selectedPlan && !loading
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Procesando...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Proceder con Upgrade</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
