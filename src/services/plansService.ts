import { Plan, UpgradeOption, User } from '../types';

// Configuración de planes disponibles
export const AVAILABLE_PLANS: Plan[] = [
  {
    id: 'individual',
    name: 'Plan Individual',
    price: 'Gratis',
    maxUsers: 1,
    features: [
      'Gestión completa de clientes',
      'Optimización de rutas',
      'Registro de entregas',
      'Inventario básico',
      'Reportes básicos',
      'Soporte por email'
    ],
    description: 'Ideal para emprendedores y pequeños negocios'
  },
  {
    id: 'business',
    name: 'Plan Business',
    price: '$29/mes',
    maxUsers: 11,
    features: [
      'Gestión completa de clientes',
      'Optimización de rutas',
      'Registro de entregas',
      'Inventario básico',
      'Reportes básicos',
      'Soporte por email'
    ],
    description: 'Perfecto para empresas con empleados',
    isPopular: true
  },
  {
    id: 'enterprise',
    name: 'Plan Enterprise',
    price: '$99/mes',
    maxUsers: null, // Ilimitado
    features: [
      'Gestión completa de clientes',
      'Optimización de rutas',
      'Registro de entregas',
      'Inventario básico',
      'Reportes básicos',
      'Soporte por email'
    ],
    description: 'Para empresas grandes con necesidades complejas'
  }
];

// Función para obtener plan por ID
export const getPlanById = (planId: string): Plan | undefined => {
  return AVAILABLE_PLANS.find(plan => plan.id === planId);
};

// Función para obtener el plan actual del usuario
export const getCurrentUserPlan = (userData: Pick<User, 'plan'> | null | undefined): Plan | undefined => {
  if (!userData || !userData.plan) return AVAILABLE_PLANS[0]; // Individual por defecto
  return getPlanById(userData.plan);
};

// Función para verificar si se puede agregar más usuarios
export const canAddMoreUsers = (currentUserCount: number, planId: string): boolean => {
  const plan = getPlanById(planId);
  if (!plan) return false;
  
  if (plan.maxUsers === null) return true; // Enterprise - sin límite
  return currentUserCount < plan.maxUsers;
};

// Función para obtener opciones de upgrade
export const getUpgradeOptions = (currentPlanId: string): UpgradeOption[] => {
  const currentPlan = getPlanById(currentPlanId);
  if (!currentPlan) return [];
  
  const upgradeOptions: UpgradeOption[] = [];
  
  if (currentPlanId === 'individual') {
    // Individual puede upgrade a Business o Enterprise
    upgradeOptions.push(
      {
        planId: 'business',
        name: 'Plan Business',
        price: '$29/mes',
        maxUsers: 11,
        features: [
          'Hasta 10 empleados',
          'Soporte prioritario',
          'Reportes avanzados',
          'Backup automático'
        ]
      },
      {
        planId: 'enterprise',
        name: 'Plan Enterprise',
        price: '$99/mes',
        maxUsers: null,
        features: [
          'Empleados ilimitados',
          'API completa',
          'Soporte 24/7',
          'Personalización avanzada'
        ]
      }
    );
  } else if (currentPlanId === 'business') {
    // Business solo puede upgrade a Enterprise
    upgradeOptions.push({
      planId: 'enterprise',
      name: 'Plan Enterprise',
      price: '$99/mes',
      maxUsers: null,
      features: [
        'Empleados ilimitados',
        'API completa',
        'Soporte 24/7',
        'Personalización avanzada'
      ]
    });
  }
  
  return upgradeOptions;
};

// Función para calcular el precio del upgrade
export const calculateUpgradePrice = (fromPlanId: string, toPlanId: string): string => {
  const fromPlan = getPlanById(fromPlanId);
  const toPlan = getPlanById(toPlanId);
  
  if (!fromPlan || !toPlan) return 'Precio no disponible';
  
  if (fromPlanId === 'individual' && toPlanId === 'business') {
    return '$29/mes';
  } else if (fromPlanId === 'individual' && toPlanId === 'enterprise') {
    return '$99/mes';
  } else if (fromPlanId === 'business' && toPlanId === 'enterprise') {
    return '$70/mes (diferencia)';
  }
  
  return 'Precio no disponible';
};

// Función para obtener el próximo plan recomendado
export const getRecommendedUpgrade = (currentPlanId: string): Plan | null => {
  if (currentPlanId === 'individual') {
    const businessPlan = getPlanById('business');
    return businessPlan || null;
  } else if (currentPlanId === 'business') {
    const enterprisePlan = getPlanById('enterprise');
    return enterprisePlan || null;
  }
  
  return null; // Ya está en el plan más alto
};

// Función para validar si un usuario puede ser creado
export const validateUserCreation = (
  currentUserCount: number, 
  planId: string, 
  newUserRole: string
): { canCreate: boolean; reason?: string } => {
  const plan = getPlanById(planId);
  if (!plan) {
    return { canCreate: false, reason: 'Plan no válido' };
  }
  
  // Verificar límite de usuarios
  if (plan.maxUsers !== null && currentUserCount >= plan.maxUsers) {
    return { 
      canCreate: false, 
      reason: `Límite de ${plan.maxUsers} usuarios alcanzado en el plan ${plan.name}` 
    };
  }
  
  // Verificar roles permitidos por plan
  if (planId === 'individual' && newUserRole !== 'admin') {
    return { 
      canCreate: false, 
      reason: 'El plan Individual solo permite usuarios administradores' 
    };
  }
  
  return { canCreate: true };
};
