import React, { useState } from 'react';
import { Crown, Building, Users, Star, Zap, Shield, TrendingUp, Check } from 'lucide-react';
import { useUserLimit } from '../../hooks/useUserLimit';
import { getCurrentUserPlan, getRecommendedUpgrade } from '../../services/plansService';
import { UpgradePlanModal } from './UpgradePlanModal';
import { useAuthStore } from '../../store/authStore';

export const PlanInfo: React.FC = () => {
  const { userData } = useAuthStore();
  const { currentUserCount, maxUsers, currentPlan } = useUserLimit();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  if (!userData) return null;

  const currentPlanData = getCurrentUserPlan(userData);
  const recommendedUpgrade = getRecommendedUpgrade(currentPlan);

  if (!currentPlanData) return null;

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

  const getUsagePercentage = () => {
    if (maxUsers === null) return 0; // Enterprise - sin límite
    return Math.round((currentUserCount / maxUsers) * 100);
  };

  const getUsageColor = () => {
    const percentage = getUsagePercentage();
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressColor = () => {
    const percentage = getUsagePercentage();
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        {/* Header del Plan */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {getPlanIcon(currentPlanData.id)}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {currentPlanData.name}
              </h3>
              <p className="text-sm text-gray-600">
                {currentPlanData.description}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {currentPlanData.price}
            </div>
            <div className="text-sm text-gray-500">por mes</div>
          </div>
        </div>

        {/* Uso de Usuarios */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Uso de Usuarios</span>
            <span className={`text-sm font-semibold ${getUsageColor()}`}>
              {currentUserCount} / {maxUsers || '∞'}
            </span>
          </div>
          
          {maxUsers && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
                style={{ width: `${Math.min(getUsagePercentage(), 100)}%` }}
              />
            </div>
          )}
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">
              {getUsagePercentage()}% del límite utilizado
            </span>
            {maxUsers && currentUserCount >= maxUsers && (
              <span className="text-xs text-red-600 font-medium">
                ¡Límite alcanzado!
              </span>
            )}
          </div>
        </div>

        {/* Características del Plan */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Características incluidas:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {currentPlanData.features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-600">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recomendación de Upgrade */}
        {recommendedUpgrade && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="flex-1">
                <h5 className="text-sm font-medium text-blue-900">
                  Recomendación de Upgrade
                </h5>
                <p className="text-sm text-blue-700 mt-1">
                  Considera actualizar a {recommendedUpgrade.name} para obtener más funcionalidades 
                  y {recommendedUpgrade.maxUsers ? `hasta ${recommendedUpgrade.maxUsers} usuarios` : 'usuarios ilimitados'}.
                </p>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium underline"
                >
                  Ver opciones de upgrade
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Botón de Upgrade */}
        {recommendedUpgrade && (
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <Zap className="h-4 w-4" />
            <span>Upgrade de Plan</span>
          </button>
        )}

        {/* Información de Soporte */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <Shield className="h-4 w-4" />
            <span>
              {currentPlanData.id === 'enterprise' 
                ? 'Soporte 24/7 incluido' 
                : currentPlanData.id === 'business' 
                ? 'Soporte prioritario incluido'
                : 'Soporte por email incluido'
              }
            </span>
          </div>
        </div>
      </div>

      {/* Modal de Upgrade */}
      {showUpgradeModal && (
        <UpgradePlanModal 
          currentPlan={currentPlan}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </>
  );
};
