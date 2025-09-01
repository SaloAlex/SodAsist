import { FirebaseService } from './firebaseService';
import { User, Tenant } from '../types';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';

export interface EmployeeInvitation {
  email: string;
  rol: 'admin' | 'manager' | 'sodero';
  nombre: string;
  tenantId: string;
  invitedBy: string;
  invitedAt: Date;
}

export interface EmployeeUpdate {
  uid: string;
  rol?: 'admin' | 'manager' | 'sodero';
  isActive?: boolean;
}

export class EmployeeManagementService {
  // Invitar un nuevo empleado
  static async inviteEmployee(invitation: EmployeeInvitation): Promise<boolean> {
    try {
      console.log('📧 Invitando empleado:', invitation);
      
      // Verificar que el tenant existe y tiene espacio
      const tenant = await FirebaseService.getDocument<Tenant>('tenants', invitation.tenantId);
      if (!tenant) {
        throw new Error('Tenant no encontrado');
      }
      
      // Verificar límite de usuarios
      if (tenant.plan === 'individual' && tenant.currentUserCount >= 1) {
        throw new Error('Plan individual solo permite 1 usuario');
      }
      
      if (tenant.plan === 'business' && tenant.currentUserCount >= 11) {
        throw new Error('Plan business solo permite hasta 11 usuarios');
      }
      
      // Crear documento de invitación
      const invitationData = {
        ...invitation,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
      };
      
      await FirebaseService.addDocument('invitations', invitationData);
      
      // Actualizar contador de usuarios en tenant
      await updateDoc(doc(db, 'tenants', invitation.tenantId), {
        currentUserCount: tenant.currentUserCount + 1,
        updatedAt: new Date()
      });
      
      toast.success(`Invitación enviada a ${invitation.email}`);
      return true;
      
    } catch (error) {
      console.error('❌ Error invitando empleado:', error);
      toast.error(`Error al invitar empleado: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return false;
    }
  }
  
  // Obtener lista de empleados del tenant
  static async getEmployees(tenantId: string): Promise<User[]> {
    try {
      const users = await FirebaseService.getCollection<User>('users');
      return users.filter(user => user.tenantId === tenantId && user.uid !== user.tenantId);
    } catch (error) {
      console.error('❌ Error obteniendo empleados:', error);
      return [];
    }
  }
  
  // Cambiar rol de empleado
  static async changeEmployeeRole(uid: string, newRole: 'admin' | 'manager' | 'sodero'): Promise<boolean> {
    try {
      await FirebaseService.updateDocument('users', uid, {
        rol: newRole,
        updatedAt: new Date()
      });
      
      toast.success('Rol actualizado correctamente');
      return true;
      
    } catch (error) {
      console.error('❌ Error cambiando rol:', error);
      toast.error('Error al cambiar rol');
      return false;
    }
  }
  
  // Remover empleado
  static async removeEmployee(uid: string, tenantId: string): Promise<boolean> {
    try {
      // Obtener tenant para actualizar contador
      const tenant = await FirebaseService.getDocument<Tenant>('tenants', tenantId);
      if (!tenant) {
        throw new Error('Tenant no encontrado');
      }
      
      // Desactivar empleado (no eliminar)
      await FirebaseService.updateDocument('users', uid, {
        isActive: false,
        updatedAt: new Date()
      });
      
      // Actualizar contador de usuarios
      await updateDoc(doc(db, 'tenants', tenantId), {
        currentUserCount: Math.max(0, tenant.currentUserCount - 1),
        updatedAt: new Date()
      });
      
      toast.success('Empleado removido correctamente');
      return true;
      
    } catch (error) {
      console.error('❌ Error removiendo empleado:', error);
      toast.error('Error al remover empleado');
      return false;
    }
  }
  
  // Obtener estadísticas del tenant
  static async getTenantStats(tenantId: string): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    roleDistribution: Record<string, number>;
  }> {
    try {
      const users = await this.getEmployees(tenantId);
      
      const stats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive !== false).length,
        inactiveUsers: users.filter(u => u.isActive === false).length,
        roleDistribution: users.reduce((acc, user) => {
          acc[user.rol] = (acc[user.rol] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };
      
      return stats;
      
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        roleDistribution: {}
      };
    }
  }
}
