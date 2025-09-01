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
      
             // Obtener tenant actual - tenantId es el email del usuario
       console.log('🔍 Buscando tenant con ID:', tenantId);
       console.log('🔍 Intentando obtener tenant de la colección "tenants" con ID:', tenantId);
       
       let tenant = await FirebaseService.getDocument<Tenant>('tenants', tenantId);
       console.log('📋 Resultado de FirebaseService.getDocument:', tenant);
       
       if (!tenant) {
         console.error('❌ Tenant no encontrado para ID:', tenantId);
         console.log('🔍 Verificando si el documento existe directamente en Firestore...');
         
         // Intentar obtener el documento directamente de Firestore para debug
         try {
           console.log('📞 Llamando a getDoc directamente...');
           const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
           console.log('📄 Documento de tenant encontrado:', tenantDoc.exists());
           console.log('📄 Datos del documento:', tenantDoc.data());
           
           if (tenantDoc.exists()) {
             tenant = tenantDoc.data() as Tenant;
             console.log('✅ Tenant recuperado del documento directo:', tenant);
           } else {
             console.error('❌ Documento no existe en Firestore');
             
             // Intentar buscar en toda la colección para debug
             console.log('🔍 Buscando en toda la colección de tenants...');
             const tenantsCollection = await FirebaseService.getCollection<Tenant>('tenants');
             console.log('📋 Total de tenants en la base de datos:', tenantsCollection.length);
             console.log('📋 Tenants encontrados:', tenantsCollection.map(t => ({
               id: t.id,
               email: t.email,
               plan: t.plan
             })));
             
             throw new Error(`Tenant no encontrado para el email: ${tenantId}`);
           }
         } catch (docError) {
           console.error('❌ Error obteniendo documento directo:', docError);
           throw new Error(`Tenant no encontrado para el email: ${tenantId}`);
         }
       }
      
      // Log detallado del tenant encontrado
      console.log('📋 Tenant encontrado:', {
        id: tenant.id,
        email: tenant.email,
        plan: tenant.plan,
        maxUsers: tenant.maxUsers,
        currentUserCount: tenant.currentUserCount,
        adminUid: tenant.adminUid,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt
      });
      
             // Verificar que no se esté intentando cambiar al mismo plan
       // IMPORTANTE: Validar contra el plan del usuario, no del tenant
       // porque pueden estar desincronizados
       
       // Obtener el plan actual del usuario para validar correctamente
       console.log('🔍 Obteniendo plan actual del usuario...');
       const currentUser = await FirebaseService.getDocument<User>('users', tenant.adminUid);
       const userCurrentPlan = currentUser?.plan || 'business';
       
       console.log('🔍 Validando cambio de plan:', {
         tenantPlan: tenant.plan,
         userPlan: userCurrentPlan,
         newPlan: newPlan
       });
       
       // Validar contra el plan del usuario, no del tenant
       if (userCurrentPlan === newPlan) {
         console.error('❌ Intento de cambio al mismo plan:', {
           fromPlan: userCurrentPlan,
           toPlan: newPlan
         });
         throw new Error(`No se puede cambiar al mismo plan: ya tienes el plan ${newPlan}`);
       }
       
       console.log('🔍 Estado actual de planes:', {
         tenantPlan: tenant.plan,
         userPlan: userCurrentPlan,
         newPlan: newPlan,
         isSamePlan: userCurrentPlan === newPlan,
         tenantPlanIsBusiness: tenant.plan === 'business',
         userPlanIsBusiness: userCurrentPlan === 'business'
       });
       
       console.log('✅ Validación de plan superada, continuando con el cambio...');
      
             // Verificar que el cambio sea válido
       console.log('🔍 Validando cambio de plan:', {
         fromPlan: userCurrentPlan,
         toPlan: newPlan,
         tenantData: {
           id: tenant.id,
           plan: tenant.plan,
           maxUsers: tenant.maxUsers,
           currentUserCount: tenant.currentUserCount
         }
       });
       
       if (!this.isValidPlanChange(userCurrentPlan, newPlan)) {
         const validChanges = this.getValidChangesForPlan(userCurrentPlan);
         console.error('❌ Cambio de plan no válido:', {
           fromPlan: userCurrentPlan,
           toPlan: newPlan,
           validChanges
         });
         throw new Error(`Cambio de plan no válido: de ${userCurrentPlan} a ${newPlan}. Cambios válidos: ${validChanges.join(', ')}`);
       }
      
      console.log('✅ Cambio de plan válido confirmado');
      
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
      
             // Actualizar plan del usuario directamente usando su UID
       console.log('🔄 Actualizando plan del usuario directamente...');
       
       try {
         // Obtener el usuario del tenant para obtener su UID
         const currentUser = await FirebaseService.getDocument<User>('users', tenant.adminUid);
         if (currentUser) {
           console.log('👤 Usuario encontrado, actualizando plan...');
           
                       // Actualizar directamente el usuario usando su UID
            await updateDoc(doc(db, 'users', tenant.adminUid), {
              plan: newPlan,
              updatedAt: new Date()
            });
           
           console.log('✅ Usuario actualizado correctamente en Firestore');
           toast.success(`Plan cambiado a ${newPlan} correctamente`);
           return true;
         } else {
           console.error('❌ No se pudo obtener el usuario para actualizar');
           toast.error('Error: No se pudo actualizar el usuario');
           return false;
         }
       } catch (updateError) {
         console.error('❌ Error actualizando usuario:', updateError);
         toast.error(`Error al actualizar usuario: ${updateError instanceof Error ? updateError.message : 'Error desconocido'}`);
         return false;
       }
      
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
  
  // Obtener cambios válidos para un plan específico
  private static getValidChangesForPlan(plan: 'individual' | 'business' | 'enterprise'): string[] {
    const validChanges: Record<string, string[]> = {
      'individual': ['business', 'enterprise'],
      'business': ['individual', 'enterprise'],
      'enterprise': ['individual', 'business']
    };
    
    return validChanges[plan] || [];
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
  

  
  // Obtener opciones de upgrade disponibles
  static getAvailableUpgrades(currentPlan: 'individual' | 'business' | 'enterprise'): {
    plan: 'business' | 'enterprise';
    name: string;
    price: string;
    maxUsers: number | null;
    features: string[];
  }[] {
    const upgrades: {
      plan: 'business' | 'enterprise';
      name: string;
      price: string;
      maxUsers: number | null;
      features: string[];
    }[] = [];
    
    if (currentPlan === 'individual') {
      upgrades.push(
        {
          plan: 'business' as const,
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
          plan: 'enterprise' as const,
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
        plan: 'enterprise' as const,
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
    const downgrades: {
      plan: 'individual' | 'business';
      name: string;
      price: string;
      maxUsers: number;
      features: string[];
      warning?: string;
    }[] = [];
    
    if (currentPlan === 'enterprise') {
      downgrades.push(
        {
          plan: 'business' as const,
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
          plan: 'individual' as const,
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
        plan: 'individual' as const,
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
  
  // Sincronizar plan del usuario con el tenant
  static async syncUserPlanWithTenant(userId: string, tenantId: string): Promise<boolean> {
    try {
      console.log('🔄 Sincronizando plan del usuario con el tenant...');
      
      // Obtener usuario primero
      const user = await FirebaseService.getDocument<User>('users', userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }
      
      console.log('👤 Usuario encontrado:', {
        uid: user.uid,
        email: user.email,
        plan: user.plan,
        tenantId: user.tenantId
      });
      
      // Obtener tenant
      let tenant = await FirebaseService.getDocument<Tenant>('tenants', tenantId);
      
      // Si el tenant no existe, crearlo
      if (!tenant) {
        console.log('⚠️ Tenant no encontrado, creando nuevo tenant...');
        
        try {
          // Calcular maxUsers según el plan del usuario
          let maxUsers: number;
          switch (user.plan) {
            case 'individual':
              maxUsers = 1;
              break;
            case 'business':
              maxUsers = 11;
              break;
            case 'enterprise':
              maxUsers = 999; // Número alto para representar "ilimitado"
              break;
            default:
              maxUsers = 1;
          }
          
          const newTenant = {
            id: tenantId,
            nombre: user.nombre || 'Mi Empresa',
            email: user.email,
            plan: user.plan,
            maxUsers: maxUsers,
            currentUserCount: 1,
            adminUid: user.uid,
            empleados: [],
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          await FirebaseService.createTenantDocument(newTenant);
          console.log('✅ Nuevo tenant creado:', newTenant);
          
          tenant = newTenant as Tenant;
          
        } catch (createError) {
          console.error('❌ Error creando tenant:', createError);
          throw new Error(`No se pudo crear el tenant: ${createError instanceof Error ? createError.message : 'Error desconocido'}`);
        }
      }
      
      console.log('📋 Tenant encontrado/creado:', {
        id: tenant.id,
        email: tenant.email,
        plan: tenant.plan,
        maxUsers: tenant.maxUsers,
        currentUserCount: tenant.currentUserCount
      });
      
      // Si son diferentes, actualizar el usuario
      if (user.plan !== tenant.plan) {
        console.log('⚠️ Planes diferentes detectados, actualizando usuario...');
        
        await FirebaseService.updateDocument('users', userId, {
          plan: tenant.plan,
          updatedAt: new Date()
        });
        
        console.log('✅ Plan del usuario actualizado a:', tenant.plan);
        toast.success(`Plan sincronizado: ${tenant.plan}`);
        return true;
      }
      
      console.log('✅ Planes ya están sincronizados');
      return true;
      
    } catch (error) {
      console.error('❌ Error sincronizando planes:', error);
      toast.error('Error al sincronizar planes');
      return false;
    }
  }
}
