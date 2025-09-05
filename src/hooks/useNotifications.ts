import { useState, useEffect, useCallback } from 'react';
import { notificationService, SystemNotification } from '../services/notificationService';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface UseNotificationsReturn {
  notifications: SystemNotification[];
  loading: boolean;
  error: string | null;
  counts: {
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
  };
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  createSampleNotifications: () => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState({
    total: 0,
    unread: 0,
    byPriority: {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0
    },
    byType: {
      alert: 0,
      warning: 0,
      info: 0,
      success: 0
    }
  });

  const loadNotifications = useCallback(async () => {
    if (!user?.email) {
      setNotifications([]);
      setCounts({
        total: 0,
        unread: 0,
        byPriority: { urgent: 0, high: 0, medium: 0, low: 0 },
        byType: { alert: 0, warning: 0, info: 0, success: 0 }
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [notificationsData, countsData] = await Promise.all([
        notificationService.getNotifications(user.email),
        notificationService.getNotificationCounts(user.email)
      ]);

      setNotifications(notificationsData);
      setCounts(countsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar notificaciones';
      setError(errorMessage);
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      
      // Actualizar estado local
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true, updatedAt: new Date() }
            : notification
        )
      );

      // Actualizar contadores
      setCounts(prev => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1)
      }));

      toast.success('Notificación marcada como leída');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al marcar notificación';
      toast.error(errorMessage);
      console.error('Error marking notification as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      
      // Actualizar estado local
      setNotifications(prev => 
        prev.map(notification => ({ 
          ...notification, 
          read: true, 
          updatedAt: new Date() 
        }))
      );

      // Actualizar contadores
      setCounts(prev => ({
        ...prev,
        unread: 0
      }));

      toast.success('Todas las notificaciones marcadas como leídas');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al marcar notificaciones';
      toast.error(errorMessage);
      console.error('Error marking all notifications as read:', err);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      
      // Actualizar estado local
      const deletedNotification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(notification => notification.id !== notificationId));

      // Actualizar contadores
      setCounts(prev => ({
        ...prev,
        total: prev.total - 1,
        unread: deletedNotification && !deletedNotification.read ? prev.unread - 1 : prev.unread,
        byPriority: {
          ...prev.byPriority,
          [deletedNotification?.priority || 'low']: Math.max(0, prev.byPriority[deletedNotification?.priority || 'low'] - 1)
        },
        byType: {
          ...prev.byType,
          [deletedNotification?.type || 'info']: Math.max(0, prev.byType[deletedNotification?.type || 'info'] - 1)
        }
      }));

      toast.success('Notificación eliminada');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar notificación';
      toast.error(errorMessage);
      console.error('Error deleting notification:', err);
    }
  }, [notifications]);

  const deleteAllNotifications = useCallback(async () => {
    try {
      await notificationService.deleteAllNotifications();
      
      // Limpiar estado local
      setNotifications([]);
      setCounts({
        total: 0,
        unread: 0,
        byPriority: { urgent: 0, high: 0, medium: 0, low: 0 },
        byType: { alert: 0, warning: 0, info: 0, success: 0 }
      });

      toast.success('Todas las notificaciones eliminadas');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar notificaciones';
      toast.error(errorMessage);
      console.error('Error deleting all notifications:', err);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  const createSampleNotifications = useCallback(async () => {
    try {
      await notificationService.createSampleNotifications();
      await loadNotifications();
      toast.success('Notificaciones de ejemplo creadas');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear notificaciones de ejemplo';
      toast.error(errorMessage);
      console.error('Error creating sample notifications:', err);
    }
  }, [loadNotifications]);

  // Cargar notificaciones al montar el componente y cuando cambie el usuario
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Recargar notificaciones cuando la ventana vuelve a tener foco
  useEffect(() => {
    const handleFocus = () => {
      loadNotifications();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadNotifications]);

  return {
    notifications,
    loading,
    error,
    counts,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refreshNotifications,
    createSampleNotifications
  };
};
