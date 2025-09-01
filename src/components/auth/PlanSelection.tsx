import React, { useState } from 'react';
import { Crown, Building, Users, Check, Star } from 'lucide-react';
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
        {AVAILABLE_PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 bg-white ${
              selectedPlan === plan.id
                ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
            } ${
              hoveredPlan === plan.id ? 'transform -translate-y-1' : ''
            }`}
            onClick={() => onPlanChange(plan.id)}
            onMouseEnter={() => setHoveredPlan(plan.id)}
            onMouseLeave={() => setHoveredPlan(null)}
          >
            {/* Badge de Popular */}
            {plan.isPopular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center space-x-1">
                  <Star className="h-3 w-3" />
                  <span>POPULAR</span>
                </div>
              </div>
            )}

            {/* Header del Plan */}
            <div className="text-center mb-3">
              <div className="flex justify-center mb-2">
                {getPlanIcon(plan.id)}
              </div>
              <h4 className="text-lg font-bold text-gray-900">{plan.name}</h4>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {plan.price}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {plan.maxUsers ? `Hasta ${plan.maxUsers} usuarios` : 'Usuarios ilimitados'}
              </p>
            </div>

            {/* Características */}
            <div className="space-y-1.5 mb-3">
              {getPlanFeatures(plan).map((feature: string, index: number) => (
                <div key={index} className="flex items-start space-x-2">
                  <Check className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-600 leading-tight">{feature}</span>
                </div>
              ))}
            </div>

            {/* Descripción */}
            <div className="text-center mb-3">
              <p className="text-xs text-gray-600 leading-tight">{plan.description}</p>
            </div>

            {/* Selección */}
            <div className="text-center">
              <div className={`w-4 h-4 rounded-full border-2 mx-auto ${
                selectedPlan === plan.id
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300'
              }`}>
                {selectedPlan === plan.id && (
                  <div className="w-1.5 h-1.5 bg-white rounded-full m-auto" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Información adicional */}
      <div className="text-center text-sm text-gray-500 mt-6">
        <p>
          💡 <strong>Consejo:</strong> Comienza con el plan Individual y actualiza según crezca tu negocio.
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
