import { FirebaseService } from './firebaseService';
import { Tenant, User } from '../types';
import { validateUserCreation, getPlanById } from './plansService';
import toast from 'react-hot-toast';

export interface CreateTenantData {
  id: string;
  nombre: string;
  email: string;
  plan: 'individual' | 'business' | 'enterprise';
  adminUid: string;
}

export interface UpdateTenantPlanData {
  tenantId: string;
  newPlan: 'individual' | 'business' | 'enterprise';
  reason: 'user_limit_reached' | 'manual_upgrade' | 'downgrade';
}

export class TenantManagementService {
  /**
   * Crear un nuevo tenant
   */
  static async createTenant(data: CreateTenantData): Promise<void> {
    try {
      console.log('🔧 Creando nuevo tenant:', data);
      
      const plan = getPlanById(data.plan);
      if (!plan) {
        throw new Error(`Plan ${data.plan} no válido`);
      }

      const tenantData: Omit<Tenant, 'id'> = {
        nombre: data.nombre,
        email: data.email,
        plan: data.plan,
        maxUsers: plan.maxUsers || 1,
        currentUserCount: 1, // Solo el admin inicial
        adminUid: data.adminUid,
        empleados: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        upgradeHistory: []
      };

      await FirebaseService.createTenantDocument({
        id: data.id,
        ...tenantData
      });

      console.log('✅ Tenant creado exitosamente');
      toast.success('Tenant creado correctamente');
    } catch (error) {
      console.error('❌ Error creando tenant:', error);
      toast.error('Error al crear el tenant');
      throw error;
    }
  }

  /**
   * Actualizar el plan de un tenant
   */
  static async updateTenantPlan(data: UpdateTenantPlanData): Promise<void> {
    try {
      console.log('🔧 Actualizando plan del tenant:', data);
      
      const tenant = await FirebaseService.getDocument<Tenant>('tenants', data.tenantId);
      if (!tenant) {
        throw new Error('Tenant no encontrado');
      }

      const newPlan = getPlanById(data.newPlan);
      if (!newPlan) {
        throw new Error(`Plan ${data.newPlan} no válido`);
      }

      // Verificar que el nuevo plan sea un upgrade válido
      const currentPlanIndex = ['individual', 'business', 'enterprise'].indexOf(tenant.plan);
      const newPlanIndex = ['individual', 'business', 'enterprise'].indexOf(data.newPlan);
      
      if (newPlanIndex <= currentPlanIndex && data.reason !== 'downgrade') {
        throw new Error('Solo se permiten upgrades a planes superiores');
      }

      // Actualizar el tenant
      const updateData = {
        plan: data.newPlan,
        maxUsers: newPlan.maxUsers,
        updatedAt: new Date(),
        upgradeHistory: [
          ...(tenant.upgradeHistory || []),
          {
            fromPlan: tenant.plan,
            toPlan: data.newPlan,
            date: new Date(),
            reason: data.reason
          }
        ]
      };

      await FirebaseService.updateDocument('tenants', data.tenantId, updateData);

      console.log('✅ Plan del tenant actualizado exitosamente');
      toast.success(`Plan actualizado a ${newPlan.name}`);
    } catch (error) {
      console.error('❌ Error actualizando plan del tenant:', error);
      toast.error('Error al actualizar el plan');
      throw error;
    }
  }

  /**
   * Verificar si se puede agregar un usuario al tenant
   */
  static async canAddUserToTenant(tenantId: string, newUserRole: string): Promise<{
    canCreate: boolean;
    reason?: string;
    currentCount: number;
    maxUsers: number | null;
  }> {
    try {
      const tenant = await FirebaseService.getDocument<Tenant>('tenants', tenantId);
      if (!tenant) {
        return { canCreate: false, reason: 'Tenant no encontrado', currentCount: 0, maxUsers: 0 };
      }

      // Obtener el conteo actual de usuarios
      const users = await FirebaseService.getCollection('users');
      const tenantUsers = users.filter((user: unknown) => {
        const userObj = user as { tenantId?: string };
        return userObj.tenantId === tenantId;
      });
      const currentCount = tenantUsers.length;

      // Validar creación del usuario
      const validation = validateUserCreation(currentCount, tenant.plan, newUserRole);

      return {
        canCreate: validation.canCreate,
        reason: validation.reason,
        currentCount,
        maxUsers: tenant.maxUsers
      };
    } catch (error) {
      console.error('❌ Error verificando límite de usuarios:', error);
      return { canCreate: false, reason: 'Error al verificar límite', currentCount: 0, maxUsers: 0 };
    }
  }

  /**
   * Obtener información del tenant actual
   */
  static async getCurrentTenantInfo(userId: string): Promise<Tenant | null> {
    try {
      const user = await FirebaseService.getDocument<User>('users', userId);
      if (!user || !user.tenantId) {
        return null;
      }

      return await FirebaseService.getDocument<Tenant>('tenants', user.tenantId);
    } catch (error) {
      console.error('❌ Error obteniendo información del tenant:', error);
      return null;
    }
  }

  /**
   * Obtener estadísticas del tenant
   */
  static async getTenantStats(tenantId: string): Promise<{
    totalUsers: number;
    totalClientes: number;
    totalEntregas: number;
    plan: string;
    maxUsers: number | null;
    usagePercentage: number;
  }> {
    try {
      const [users, clientes, entregas, tenant] = await Promise.all([
        FirebaseService.getCollection('users'),
        FirebaseService.getCollection('clientes'),
        FirebaseService.getCollection('entregas'),
        FirebaseService.getDocument<Tenant>('tenants', tenantId)
      ]);

      const tenantUsers = users.filter((user: unknown) => {
        const userObj = user as { tenantId?: string };
        return userObj.tenantId === tenantId;
      });
      const tenantClientes = clientes.filter((cliente: unknown) => {
        const clienteObj = cliente as { tenantId?: string };
        return clienteObj.tenantId === tenantId;
      });
      const tenantEntregas = entregas.filter((entrega: unknown) => {
        const entregaObj = entrega as { tenantId?: string };
        return entregaObj.tenantId === tenantId;
      });

      const totalUsers = tenantUsers.length;
      const maxUsers = tenant?.maxUsers || 1;
      const usagePercentage = maxUsers ? (totalUsers / maxUsers) * 100 : 0;

      return {
        totalUsers,
        totalClientes: tenantClientes.length,
        totalEntregas: tenantEntregas.length,
        plan: tenant?.plan || 'individual',
        maxUsers,
        usagePercentage
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas del tenant:', error);
      throw error;
    }
  }

  /**
   * Migrar usuario a un tenant existente
   */
  static async migrateUserToTenant(userId: string, targetTenantId: string): Promise<void> {
    try {
      console.log('🔧 Migrando usuario a tenant:', { userId, targetTenantId });
      
      // Verificar que el tenant destino existe
      const targetTenant = await FirebaseService.getDocument<Tenant>('tenants', targetTenantId);
      if (!targetTenant) {
        throw new Error('Tenant destino no encontrado');
      }

      // Verificar límite de usuarios
      const canAdd = await this.canAddUserToTenant(targetTenantId, 'sodero');
      if (!canAdd.canCreate) {
        throw new Error(canAdd.reason || 'No se puede agregar más usuarios al tenant');
      }

      // Actualizar el usuario
      await FirebaseService.updateDocument('users', userId, {
        tenantId: targetTenantId,
        updatedAt: new Date()
      });

      // Actualizar contador del tenant
      const currentStats = await this.getTenantStats(targetTenantId);
      await FirebaseService.updateDocument('tenants', targetTenantId, {
        currentUserCount: currentStats.totalUsers + 1,
        updatedAt: new Date()
      });

      console.log('✅ Usuario migrado exitosamente');
      toast.success('Usuario migrado correctamente');
    } catch (error) {
      console.error('❌ Error migrando usuario:', error);
      toast.error('Error al migrar el usuario');
      throw error;
    }
  }
}
