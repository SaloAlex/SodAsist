import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from '../store/authStore';

// Tipos de notificaciones del sistema
export interface SystemNotification {
  id?: string;
  type: 'alert' | 'info' | 'success' | 'warning';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  category: 'sistema' | 'entrega' | 'cliente' | 'pago' | 'inventario';
  actionLabel?: string;
  actionUrl?: string;
  dismissible: boolean;
  read: boolean;
  metadata?: {
    [key: string]: string | number | boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  userId: string; // Para multi-tenancy
}

// Tipos para alertas automáticas
export interface AlertConfig {
  id: string;
  active: boolean;
  type: 'inventory_low' | 'payment_overdue' | 'client_inactive' | 'sales_low';
  threshold: number;
  condition: 'less_than' | 'greater_than' | 'equals';
  frequency: 'immediate' | 'daily' | 'weekly';
  lastTriggered?: Date;
  userId: string;
}

class NotificationService {
  private getCollectionPath(userId: string) {
    return `tenants/${userId}/notifications`;
  }

  private getAlertsCollectionPath(userId: string) {
    return `tenants/${userId}/alertConfigs`;
  }

  // Crear notificación del sistema
  async createSystemNotification(notification: Omit<SystemNotification, 'id' | 'createdAt' | 'updatedAt' | 'read'>): Promise<string> {
    const { user } = useAuthStore.getState();
    if (!user?.email) {
      throw new Error('Usuario no autenticado');
    }

    const notificationData: Omit<SystemNotification, 'id'> = {
      ...notification,
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: user.email
    };

    const docRef = await addDoc(collection(db, this.getCollectionPath(user.email)), {
      ...notificationData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return docRef.id;
  }

  // Obtener notificaciones del usuario
  async getNotifications(userId: string, limitCount: number = 50): Promise<SystemNotification[]> {
    const q = query(
      collection(db, this.getCollectionPath(userId)),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as SystemNotification;
    });
  }

  // Marcar notificación como leída
  async markAsRead(notificationId: string): Promise<void> {
    const { user } = useAuthStore.getState();
    if (!user?.email) {
      throw new Error('Usuario no autenticado');
    }

    const notificationRef = doc(db, this.getCollectionPath(user.email), notificationId);
    await updateDoc(notificationRef, {
      read: true,
      updatedAt: serverTimestamp()
    });
  }

  // Marcar todas las notificaciones como leídas
  async markAllAsRead(): Promise<void> {
    const { user } = useAuthStore.getState();
    if (!user?.email) {
      throw new Error('Usuario no autenticado');
    }

    const notifications = await this.getNotifications(user.email);
    const unreadNotifications = notifications.filter(n => !n.read && n.id);

    for (const notification of unreadNotifications) {
      if (notification.id) {
        await updateDoc(doc(db, this.getCollectionPath(user.email), notification.id), {
          read: true,
          updatedAt: serverTimestamp()
        });
      }
    }
  }

  // Eliminar notificación
  async deleteNotification(notificationId: string): Promise<void> {
    const { user } = useAuthStore.getState();
    if (!user?.email) {
      throw new Error('Usuario no autenticado');
    }

    await deleteDoc(doc(db, this.getCollectionPath(user.email), notificationId));
  }

  // Eliminar todas las notificaciones
  async deleteAllNotifications(): Promise<void> {
    const { user } = useAuthStore.getState();
    if (!user?.email) {
      throw new Error('Usuario no autenticado');
    }

    const notifications = await this.getNotifications(user.email);
    const notificationsWithId = notifications.filter(notification => notification.id);

    for (const notification of notificationsWithId) {
      if (notification.id) {
        await deleteDoc(doc(db, this.getCollectionPath(user.email), notification.id));
      }
    }
  }

  // Obtener contadores de notificaciones
  async getNotificationCounts(userId: string): Promise<{
    total: number;
    unread: number;
    byPriority: {
      urgent: number;
      high: number;
      medium: number;
      low: number;
    };
    byType: {
      alert: number;
      warning: number;
      info: number;
      success: number;
    };
  }> {
    const notifications = await this.getNotifications(userId);
    
    return {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      byPriority: {
        urgent: notifications.filter(n => n.priority === 'urgent').length,
        high: notifications.filter(n => n.priority === 'high').length,
        medium: notifications.filter(n => n.priority === 'medium').length,
        low: notifications.filter(n => n.priority === 'low').length
      },
      byType: {
        alert: notifications.filter(n => n.type === 'alert').length,
        warning: notifications.filter(n => n.type === 'warning').length,
        info: notifications.filter(n => n.type === 'info').length,
        success: notifications.filter(n => n.type === 'success').length
      }
    };
  }

  // ===== ALERTAS AUTOMÁTICAS =====

  // Crear configuración de alerta
  async createAlertConfig(config: Omit<AlertConfig, 'id'>): Promise<string> {
    const { user } = useAuthStore.getState();
    if (!user?.email) {
      throw new Error('Usuario no autenticado');
    }

    const docRef = await addDoc(collection(db, this.getAlertsCollectionPath(user.email)), {
      ...config,
      userId: user.email
    });

    return docRef.id;
  }

  // Obtener configuraciones de alertas
  async getAlertConfigs(userId: string): Promise<AlertConfig[]> {
    const q = query(
      collection(db, this.getAlertsCollectionPath(userId)),
      where('active', '==', true)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        lastTriggered: data.lastTriggered?.toDate()
      } as AlertConfig;
    });
  }

  // ===== ALERTAS ESPECÍFICAS =====

  // Verificar alertas de inventario bajo
  async checkInventoryAlerts(): Promise<void> {
    const { user } = useAuthStore.getState();
    if (!user?.email) {
      return;
    }

    // Obtener configuraciones de alertas de inventario
    const alertConfigs = await this.getAlertConfigs(user.email);
    const inventoryAlerts = alertConfigs.filter(config => config.type === 'inventory_low');

    if (inventoryAlerts.length === 0) {
      return;
    }

    // Aquí deberías integrar con tu servicio de inventario
    // Por ahora, crearemos una notificación de ejemplo
    for (const alert of inventoryAlerts) {
      // Verificar si ya se disparó recientemente (evitar spam)
      const shouldTrigger = !alert.lastTriggered || 
        (new Date().getTime() - alert.lastTriggered.getTime()) > 24 * 60 * 60 * 1000; // 24 horas

      if (shouldTrigger) {
        await this.createSystemNotification({
          type: 'warning',
          priority: 'high',
          title: 'Stock Bajo Detectado',
          message: `El inventario está por debajo del umbral configurado (${alert.threshold} unidades)`,
          category: 'inventario',
          actionLabel: 'Ver Inventario',
          actionUrl: '/inventario',
          dismissible: true,
          userId: user.email,
          metadata: {
            alertId: alert.id,
            threshold: alert.threshold
          }
        });
      }
    }
  }

  // Verificar alertas de pagos vencidos
  async checkPaymentAlerts(): Promise<void> {
    const { user } = useAuthStore.getState();
    if (!user?.email) {
      return;
    }

    const alertConfigs = await this.getAlertConfigs(user.email);
    const paymentAlerts = alertConfigs.filter(config => config.type === 'payment_overdue');

    if (paymentAlerts.length === 0) {
      return;
    }

    // Aquí deberías integrar con tu servicio de entregas/clientes
    // Por ahora, crearemos una notificación de ejemplo
    for (const alert of paymentAlerts) {
      const shouldTrigger = !alert.lastTriggered || 
        (new Date().getTime() - alert.lastTriggered.getTime()) > 24 * 60 * 60 * 1000;

      if (shouldTrigger) {
        await this.createSystemNotification({
          type: 'alert',
          priority: 'urgent',
          title: 'Pagos Vencidos Detectados',
          message: `Se encontraron clientes con pagos vencidos por más de ${alert.threshold} días`,
          category: 'pago',
          actionLabel: 'Ver Clientes',
          actionUrl: '/clientes',
          dismissible: true,
          userId: user.email,
          metadata: {
            alertId: alert.id,
            daysOverdue: alert.threshold
          }
        });
      }
    }
  }

  // Verificar alertas de clientes inactivos
  async checkClientInactivityAlerts(): Promise<void> {
    const { user } = useAuthStore.getState();
    if (!user?.email) {
      return;
    }

    const alertConfigs = await this.getAlertConfigs(user.email);
    const clientAlerts = alertConfigs.filter(config => config.type === 'client_inactive');

    if (clientAlerts.length === 0) {
      return;
    }

    for (const alert of clientAlerts) {
      const shouldTrigger = !alert.lastTriggered || 
        (new Date().getTime() - alert.lastTriggered.getTime()) > 7 * 24 * 60 * 60 * 1000; // 7 días

      if (shouldTrigger) {
        await this.createSystemNotification({
          type: 'info',
          priority: 'medium',
          title: 'Clientes Inactivos',
          message: `Se detectaron clientes sin actividad por más de ${alert.threshold} días`,
          category: 'cliente',
          actionLabel: 'Ver Reportes',
          actionUrl: '/reportes',
          dismissible: true,
          userId: user.email,
          metadata: {
            alertId: alert.id,
            daysInactive: alert.threshold
          }
        });
      }
    }
  }

  // Ejecutar todas las verificaciones de alertas
  async runAllAlertChecks(): Promise<void> {
    await Promise.all([
      this.checkInventoryAlerts(),
      this.checkPaymentAlerts(),
      this.checkClientInactivityAlerts()
    ]);
  }

  // Crear notificaciones de ejemplo para testing
  async createSampleNotifications(): Promise<void> {
    const { user } = useAuthStore.getState();
    if (!user?.email) {
      return;
    }

    const sampleNotifications = [
      {
        type: 'alert' as const,
        priority: 'urgent' as const,
        title: 'Pago Vencido',
        message: 'Cliente "Empresa ABC" tiene una factura vencida de $1,250.00 desde hace 15 días',
        category: 'pago' as const,
        actionLabel: 'Gestionar',
        actionUrl: '/clientes',
        dismissible: true,
        userId: user.email,
        metadata: { clienteId: '123', monto: 1250 }
      },
      {
        type: 'warning' as const,
        priority: 'high' as const,
        title: 'Stock Bajo',
        message: 'Quedan menos de 10 bidones de 20L en inventario',
        category: 'inventario' as const,
        actionLabel: 'Ver Inventario',
        actionUrl: '/inventario',
        dismissible: true,
        userId: user.email
      },
      {
        type: 'info' as const,
        priority: 'medium' as const,
        title: 'Nueva Ruta Optimizada',
        message: 'Se ha generado una nueva ruta para mañana con 15 clientes',
        category: 'entrega' as const,
        actionLabel: 'Ver Ruta',
        actionUrl: '/ruta-hoy',
        dismissible: true,
        userId: user.email
      },
      {
        type: 'success' as const,
        priority: 'low' as const,
        title: 'Backup Completado',
        message: 'Respaldo automático de datos completado exitosamente a las 03:00',
        category: 'sistema' as const,
        dismissible: true,
        userId: user.email
      }
    ];

    for (const notification of sampleNotifications) {
      await this.createSystemNotification(notification);
    }
  }
}

export const notificationService = new NotificationService();
