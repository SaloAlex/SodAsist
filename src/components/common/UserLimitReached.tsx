import React, { useState } from 'react';
import { AlertTriangle, Users, Crown, Building, Rocket } from 'lucide-react';
import { useUserLimit } from '../../hooks/useUserLimit';
import { getUpgradeOptions } from '../../services/plansService';
import { UpgradePlanModal } from './UpgradePlanModal';

export const UserLimitReached: React.FC = () => {
  const { limitReached, currentUserCount, maxUsers, currentPlan } = useUserLimit();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  if (!limitReached) return null;

  const upgradeOptions = getUpgradeOptions(currentPlan);
  const currentPlanName = currentPlan === 'individual' ? 'Individual' : 
                         currentPlan === 'business' ? 'Business' : 'Enterprise';

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'individual':
        return <Users className="h-5 w-5 text-blue-500" />;
      case 'business':
        return <Building className="h-5 w-5 text-green-500" />;
      case 'enterprise':
        return <Crown className="h-5 w-5 text-purple-500" />;
      default:
        return <Users className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <>
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              Límite de usuarios alcanzado
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Has llegado al máximo de <strong>{maxUsers}</strong> usuarios 
                en tu plan <strong>{currentPlanName}</strong>.
              </p>
              <p className="mt-1">
                Actualmente tienes <strong>{currentUserCount}</strong> usuarios registrados.
              </p>
            </div>
            
            {upgradeOptions.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">
                  Opciones de upgrade disponibles:
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {upgradeOptions.map((option) => (
                    <div 
                      key={option.planId}
                      className="bg-white p-3 rounded-lg border border-yellow-200 hover:border-yellow-300 transition-colors cursor-pointer"
                      onClick={() => setShowUpgradeModal(true)}
                    >
                      <div className="flex items-center space-x-2">
                        {getPlanIcon(option.planId)}
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{option.name}</div>
                          <div className="text-sm text-gray-600">
                            {option.maxUsers ? `Hasta ${option.maxUsers} usuarios` : 'Usuarios ilimitados'}
                          </div>
                          <div className="text-lg font-bold text-green-600 mt-1">
                            {option.price}
                          </div>
                        </div>
                        <Rocket className="h-4 w-4 text-yellow-500" />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-700 transition-colors flex items-center space-x-2"
                  >
                    <Rocket className="h-4 w-4" />
                    <span>Ver Detalles de Upgrade</span>
                  </button>
                  
                  <button className="text-yellow-700 underline text-sm hover:text-yellow-800 transition-colors">
                    Contactar Soporte
                  </button>
                </div>
              </div>
            )}
            
            {upgradeOptions.length === 0 && (
              <div className="mt-4">
                <p className="text-sm text-yellow-700">
                  Ya tienes el plan más alto disponible. 
                  Si necesitas más usuarios, contacta a nuestro equipo de soporte.
                </p>
                <button className="mt-2 text-yellow-700 underline text-sm hover:text-yellow-800 transition-colors">
                  Contactar Soporte
                </button>
              </div>
            )}
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
