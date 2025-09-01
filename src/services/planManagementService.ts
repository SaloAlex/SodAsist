import { FirebaseService } from './firebaseService';
import { Tenant, User } from '../types';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';

export interface PlanChangeRequest {
  tenantId: string;
  fromPlan: 'individual' | 'business' | 'enterprise';
  toPlan: 'individual' | 'business' | 'enterprise';
  reason: 'manual_upgrade' | 'manual_downgrade' | 'user_limit_reached';
  requestedBy: string;
  requestedAt: Date;
}

export class PlanManagementService {
  // Cambiar plan del tenant
  static async changePlan(
    tenantId: string, 
    newPlan: 'individual' | 'business' | 'enterprise',
    reason: 'manual_upgrade' | 'manual_downgrade' | 'user_limit_reached' = 'manual_upgrade'
  ): Promise<boolean> {
    try {
      console.log('🔄 Cambiando plan:', { tenantId, newPlan, reason });
      
      // Obtener tenant actual
      const tenant = await FirebaseService.getDocument<Tenant>('tenants', tenantId);
      if (!tenant) {
        throw new Error('Tenant no encontrado');
      }
      
      // Verificar que el cambio sea válido
      if (!this.isValidPlanChange(tenant.plan, newPlan)) {
        throw new Error('Cambio de plan no válido');
      }
      
      // Calcular nuevo límite de usuarios
      const newMaxUsers = this.getMaxUsersForPlan(newPlan);
      
      // Verificar que no se exceda el límite actual
      if (newMaxUsers !== null && tenant.currentUserCount > newMaxUsers) {
        throw new Error(`No se puede hacer downgrade: tienes ${tenant.currentUserCount} usuarios pero el plan ${newPlan} solo permite ${newMaxUsers}`);
      }
      
      // Actualizar plan del tenant
      await updateDoc(doc(db, 'tenants', tenantId), {
        plan: newPlan,
        maxUsers: newMaxUsers,
        updatedAt: new Date(),
        upgradeHistory: [
          ...(tenant.upgradeHistory || []),
          {
            fromPlan: tenant.plan,
            toPlan: newPlan,
            date: new Date(),
            reason
          }
        ]
      });
      
      // Actualizar plan de todos los usuarios del tenant
      await this.updateUsersPlan(tenantId, newPlan);
      
      toast.success(`Plan cambiado a ${newPlan} correctamente`);
      return true;
      
    } catch (error) {
      console.error('❌ Error cambiando plan:', error);
      toast.error(`Error al cambiar plan: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return false;
    }
  }
  
  // Verificar si el cambio de plan es válido
  private static isValidPlanChange(
    fromPlan: 'individual' | 'business' | 'enterprise',
    toPlan: 'individual' | 'business' | 'enterprise'
  ): boolean {
    // Reglas de cambio de plan
    const validChanges: Record<string, string[]> = {
      'individual': ['business', 'enterprise'],
      'business': ['individual', 'enterprise'],
      'enterprise': ['individual', 'business']
    };
    
    return validChanges[fromPlan]?.includes(toPlan) || false;
  }
  
  // Obtener límite de usuarios para un plan
  private static getMaxUsersForPlan(plan: 'individual' | 'business' | 'enterprise'): number | null {
    switch (plan) {
      case 'individual': return 1;
      case 'business': return 11;
      case 'enterprise': return null; // Ilimitado
      default: return 1;
    }
  }
  
  // Actualizar plan de todos los usuarios del tenant
  private static async updateUsersPlan(tenantId: string, newPlan: 'individual' | 'business' | 'enterprise'): Promise<void> {
    try {
      const users = await FirebaseService.getCollection<User>('users');
      const tenantUsers = users.filter(user => user.tenantId === tenantId);
      
      // Actualizar plan de cada usuario
      for (const user of tenantUsers) {
        await FirebaseService.updateDocument('users', user.uid, {
          plan: newPlan,
          updatedAt: new Date()
        });
      }
      
      console.log(`✅ Plan actualizado para ${tenantUsers.length} usuarios`);
      
    } catch (error) {
      console.error('❌ Error actualizando usuarios:', error);
      throw error;
    }
  }
  
  // Obtener opciones de upgrade disponibles
  static getAvailableUpgrades(currentPlan: 'individual' | 'business' | 'enterprise'): {
    plan: 'business' | 'enterprise';
    name: string;
    price: string;
    maxUsers: number | null;
    features: string[];
  }[] {
    const upgrades = [];
    
    if (currentPlan === 'individual') {
      upgrades.push(
        {
          plan: 'business',
          name: 'Plan Business',
          price: '$29/mes',
          maxUsers: 11,
          features: [
            'Hasta 10 empleados',
            'Gestión de roles',
            'Reportes avanzados',
            'Soporte prioritario'
          ]
        },
        {
          plan: 'enterprise',
          name: 'Plan Enterprise',
          price: '$99/mes',
          maxUsers: null,
          features: [
            'Usuarios ilimitados',
            'Todas las funcionalidades',
            'Soporte 24/7',
            'API personalizada'
          ]
        }
      );
    } else if (currentPlan === 'business') {
      upgrades.push({
        plan: 'enterprise',
        name: 'Plan Enterprise',
        price: '$99/mes',
        maxUsers: null,
        features: [
          'Usuarios ilimitados',
          'Todas las funcionalidades',
          'Soporte 24/7',
          'API personalizada'
        ]
      });
    }
    
    return upgrades;
  }
  
  // Obtener opciones de downgrade disponibles
  static getAvailableDowngrades(currentPlan: 'individual' | 'business' | 'enterprise'): {
    plan: 'individual' | 'business';
    name: string;
    price: string;
    maxUsers: number;
    features: string[];
    warning?: string;
  }[] {
    const downgrades = [];
    
    if (currentPlan === 'enterprise') {
      downgrades.push(
        {
          plan: 'business',
          name: 'Plan Business',
          price: '$29/mes',
          maxUsers: 11,
          features: [
            'Hasta 10 empleados',
            'Gestión de roles',
            'Reportes avanzados'
          ],
          warning: 'Se perderá acceso a usuarios ilimitados'
        },
        {
          plan: 'individual',
          name: 'Plan Individual',
          price: 'Gratis',
          maxUsers: 1,
          features: [
            '1 usuario',
            'Funcionalidades básicas'
          ],
          warning: 'Se perderá acceso a empleados y funcionalidades avanzadas'
        }
      );
    } else if (currentPlan === 'business') {
      downgrades.push({
        plan: 'individual',
        name: 'Plan Individual',
        price: 'Gratis',
        maxUsers: 1,
        features: [
          '1 usuario',
          'Funcionalidades básicas'
        ],
        warning: 'Se perderá acceso a empleados y funcionalidades avanzadas'
      });
    }
    
    return downgrades;
  }
  
  // Verificar si se puede hacer upgrade
  static canUpgrade(currentPlan: 'individual' | 'business' | 'enterprise'): boolean {
    return currentPlan !== 'enterprise';
  }
  
  // Verificar si se puede hacer downgrade
  static canDowngrade(currentPlan: 'individual' | 'business' | 'enterprise'): boolean {
    return currentPlan !== 'individual';
  }
}
