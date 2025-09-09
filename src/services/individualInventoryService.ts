import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { useAuthStore } from '../store/authStore';

/**
 * Servicio para manejar la sincronización automática del inventario
 * para usuarios con plan individual
 */
export class IndividualInventoryService {
  
  /**
   * Sincronizar el inventario del vehículo con el depósito para usuarios individuales
   */
  static async syncInventory(): Promise<{
    success: boolean;
    message: string;
    productosSincronizados: number;
    inventario?: Record<string, number>;
  }> {
    const { userData } = useAuthStore.getState();
    
    if (!userData) {
      throw new Error('Usuario no autenticado');
    }
    
    if (userData.plan !== 'individual') {
      throw new Error('Esta función solo está disponible para usuarios con plan individual');
    }
    
    try {
      const syncFunction = httpsCallable(functions, 'syncIndividualInventoryData');
      const result = await syncFunction({ 
        tenantId: userData.tenantId 
      });
      
      return result.data as {
        success: boolean;
        message: string;
        productosSincronizados: number;
        inventario?: Record<string, number>;
      };
    } catch (error) {
      console.error('Error al sincronizar inventario:', error);
      throw new Error(`Error al sincronizar inventario: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
  
  /**
   * Verificar si el inventario del vehículo está sincronizado
   */
  static async isInventorySynced(): Promise<boolean> {
    const { userData } = useAuthStore.getState();
    
    if (!userData || userData.plan !== 'individual') {
      return true; // No es necesario para otros planes
    }
    
    try {
      // Verificar si existe el documento de inventario del vehículo
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      
      const inventarioRef = doc(db, `tenants/${userData.tenantId}/inventarioVehiculo`, 'actual');
      const inventarioDoc = await getDoc(inventarioRef);
      
      return inventarioDoc.exists() && inventarioDoc.data()?.sincronizadoAutomaticamente === true;
    } catch (error) {
      console.error('Error al verificar sincronización:', error);
      return false;
    }
  }
  
  /**
   * Obtener el estado de sincronización del inventario
   */
  static async getSyncStatus(): Promise<{
    isSynced: boolean;
    lastSync?: Date;
    productosCount?: number;
  }> {
    const { userData } = useAuthStore.getState();
    
    if (!userData || userData.plan !== 'individual') {
      return { isSynced: true };
    }
    
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      
      const inventarioRef = doc(db, `tenants/${userData.tenantId}/inventarioVehiculo`, 'actual');
      const inventarioDoc = await getDoc(inventarioRef);
      
      if (!inventarioDoc.exists()) {
        return { isSynced: false };
      }
      
      const data = inventarioDoc.data();
      const productosCount = Object.keys(data || {}).filter(key => 
        !['updatedAt', 'fecha', 'sincronizadoAutomaticamente', 'plan', 'inicializadoPor', 'sincronizadoManualmente'].includes(key)
      ).length;
      
      return {
        isSynced: data?.sincronizadoAutomaticamente === true,
        lastSync: data?.updatedAt?.toDate(),
        productosCount
      };
    } catch (error) {
      console.error('Error al obtener estado de sincronización:', error);
      return { isSynced: false };
    }
  }
}
