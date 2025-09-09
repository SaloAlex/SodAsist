import React, { useState } from 'react';
import { Crown, Building, Users, Check, Star, Clock } from 'lucide-react';
import { AVAILABLE_PLANS } from '../../services/plansService';
import { Plan } from '../../types';

interface PlanSelectionProps {
  selectedPlan: string;
  onPlanChange: (planId: string) => void;
  isFirstUser?: boolean;
}

export const PlanSelection: React.FC<PlanSelectionProps> = ({ 
  selectedPlan, 
  onPlanChange,
  isFirstUser = false
}) => {
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'individual':
        return <Users className="h-8 w-8 text-blue-500" />;
      case 'business':
        return <Building className="h-8 w-8 text-green-500" />;
      case 'enterprise':
        return <Crown className="h-8 w-8 text-purple-500" />;
      default:
        return <Users className="h-8 w-8 text-gray-500" />;
    }
  };

  const getPlanFeatures = (plan: Plan) => {
    // Mostrar todas las características ya que ahora son las mismas para todos los planes
    return plan.features;
  };

  const isPlanAvailable = (planId: string) => {
    // Solo el plan Individual está disponible por ahora
    return planId === 'individual';
  };

  const handlePlanClick = (planId: string) => {
    if (isPlanAvailable(planId)) {
      onPlanChange(planId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {isFirstUser ? 'Selecciona tu Plan' : 'Plan del Usuario'}
        </h3>
        <p className="text-gray-600">
          {isFirstUser 
            ? 'Elige el plan que mejor se adapte a tus necesidades. Puedes cambiar en cualquier momento.'
            : 'El plan se determina según tu empresa.'
          }
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {AVAILABLE_PLANS.map((plan) => {
          const isAvailable = isPlanAvailable(plan.id);
          return (
            <div
              key={plan.id}
              className={`relative border-2 rounded-xl p-4 transition-all duration-200 ${
                isAvailable 
                  ? 'cursor-pointer bg-white' 
                  : 'cursor-not-allowed bg-gray-50 opacity-75'
              } ${
                selectedPlan === plan.id && isAvailable
                  ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                  : isAvailable
                  ? 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  : 'border-gray-300'
              } ${
                hoveredPlan === plan.id && isAvailable ? 'transform -translate-y-1' : ''
              }`}
              onClick={() => handlePlanClick(plan.id)}
              onMouseEnter={() => isAvailable && setHoveredPlan(plan.id)}
              onMouseLeave={() => setHoveredPlan(null)}
            >
            {/* Badge de Popular o Próximamente */}
            {plan.isPopular && isAvailable && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center space-x-1">
                  <Star className="h-3 w-3" />
                  <span>POPULAR</span>
                </div>
              </div>
            )}
            {!isAvailable && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-gray-500 to-gray-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>PRÓXIMAMENTE</span>
                </div>
              </div>
            )}

            {/* Header del Plan */}
            <div className="text-center mb-3">
              <div className="flex justify-center mb-2">
                {getPlanIcon(plan.id)}
              </div>
              <h4 className={`text-lg font-bold ${isAvailable ? 'text-gray-900' : 'text-gray-500'}`}>
                {plan.name}
              </h4>
              <div className={`text-2xl font-bold mt-1 ${isAvailable ? 'text-blue-600' : 'text-gray-400'}`}>
                {plan.price}
              </div>
              <p className={`text-xs mt-1 ${isAvailable ? 'text-gray-500' : 'text-gray-400'}`}>
                {plan.maxUsers ? `Hasta ${plan.maxUsers} usuarios` : 'Usuarios ilimitados'}
              </p>
            </div>

            {/* Características */}
            <div className="space-y-1.5 mb-3">
              {getPlanFeatures(plan).map((feature: string, index: number) => (
                <div key={index} className="flex items-start space-x-2">
                  <Check className={`h-3 w-3 mt-0.5 flex-shrink-0 ${isAvailable ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className={`text-xs leading-tight ${isAvailable ? 'text-gray-600' : 'text-gray-400'}`}>
                    {feature}
                  </span>
                </div>
              ))}
            </div>

            {/* Descripción */}
            <div className="text-center mb-3">
              <p className={`text-xs leading-tight ${isAvailable ? 'text-gray-600' : 'text-gray-400'}`}>
                {plan.description}
              </p>
            </div>

            {/* Selección */}
            <div className="text-center">
              {isAvailable ? (
                <div className={`w-4 h-4 rounded-full border-2 mx-auto ${
                  selectedPlan === plan.id
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}>
                  {selectedPlan === plan.id && (
                    <div className="w-1.5 h-1.5 bg-white rounded-full m-auto" />
                  )}
                </div>
              ) : (
                <div className="w-4 h-4 rounded-full border-2 mx-auto border-gray-300 bg-gray-200">
                  <Clock className="h-2 w-2 text-gray-400 m-auto mt-0.5" />
                </div>
              )}
            </div>
          </div>
          );
        })}
      </div>

      {/* Información adicional */}
      <div className="text-center text-sm text-gray-500 mt-6">
        <p>
          💡 <strong>Consejo:</strong> Comienza con el plan Individual. Los planes Business y Enterprise estarán disponibles próximamente.
        </p>
        <p className="mt-1">
          🔄 Puedes cambiar tu plan en cualquier momento desde la configuración.
        </p>
      </div>

      {/* Plan seleccionado */}
      {selectedPlan && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <div className="flex items-center space-x-3">
            <Check className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Plan seleccionado: <strong>{AVAILABLE_PLANS.find(p => p.id === selectedPlan)?.name}</strong>
              </p>
              <p className="text-xs text-blue-700 mt-1">
                {AVAILABLE_PLANS.find(p => p.id === selectedPlan)?.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
