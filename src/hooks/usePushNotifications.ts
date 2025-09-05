import { useState, useEffect, useCallback } from 'react';
import { pushNotificationService } from '../services/pushNotificationService';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isEnabled: boolean;
  permission: NotificationPermission;
  config: {
    enabled: boolean;
    sound: boolean;
    vibration: boolean;
    showInSystemTray: boolean;
  };
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<void>;
  updateConfig: (config: Partial<typeof pushNotificationService.config>) => Promise<void>;
  sendTestNotification: () => Promise<void>;
  initialize: () => Promise<boolean>;
}

export const usePushNotifications = (): UsePushNotificationsReturn => {
  const { user } = useAuthStore();
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [config, setConfig] = useState(pushNotificationService.getConfig());

  // Verificar soporte de notificaciones
  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'Notification' in window && 'serviceWorker' in navigator;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        setIsEnabled(pushNotificationService.isEnabled());
        setConfig(pushNotificationService.getConfig());
      }
    };

    checkSupport();
  }, []);

  // Inicializar el servicio cuando el usuario cambie
  useEffect(() => {
    if (user && isSupported) {
      pushNotificationService.initialize().then((enabled) => {
        setIsEnabled(enabled);
        setConfig(pushNotificationService.getConfig());
      });
    }
  }, [user, isSupported]);

  // Solicitar permisos
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Las notificaciones no están soportadas en este navegador');
      return false;
    }

    try {
      const granted = await pushNotificationService.requestPermission();
      setPermission(Notification.permission);
      setIsEnabled(granted);
      setConfig(pushNotificationService.getConfig());
      return granted;
    } catch (error) {
      console.error('Error solicitando permisos:', error);
      toast.error('Error al solicitar permisos de notificación');
      return false;
    }
  }, [isSupported]);

  // Suscribir a notificaciones
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast.error('Debes estar autenticado para activar notificaciones');
      return false;
    }

    try {
      const success = await pushNotificationService.subscribeToNotifications();
      if (success) {
        setIsEnabled(true);
        setConfig(pushNotificationService.getConfig());
      }
      return success;
    } catch (error) {
      console.error('Error suscribiéndose a notificaciones:', error);
      toast.error('Error al activar notificaciones');
      return false;
    }
  }, [user]);

  // Desuscribir de notificaciones
  const unsubscribe = useCallback(async (): Promise<void> => {
    try {
      await pushNotificationService.unsubscribeFromNotifications();
      setIsEnabled(false);
      setConfig(pushNotificationService.getConfig());
    } catch (error) {
      console.error('Error desuscribiéndose de notificaciones:', error);
      toast.error('Error al desactivar notificaciones');
    }
  }, []);

  // Actualizar configuración
  const updateConfig = useCallback(async (newConfig: Partial<typeof pushNotificationService.config>): Promise<void> => {
    try {
      await pushNotificationService.updateConfig(newConfig);
      setConfig(pushNotificationService.getConfig());
      setIsEnabled(pushNotificationService.isEnabled());
    } catch (error) {
      console.error('Error actualizando configuración:', error);
      toast.error('Error al actualizar configuración');
    }
  }, []);

  // Enviar notificación de prueba
  const sendTestNotification = useCallback(async (): Promise<void> => {
    try {
      await pushNotificationService.sendTestNotification();
    } catch (error) {
      console.error('Error enviando notificación de prueba:', error);
      toast.error('Error al enviar notificación de prueba');
    }
  }, []);

  // Inicializar el servicio
  const initialize = useCallback(async (): Promise<boolean> => {
    try {
      const enabled = await pushNotificationService.initialize();
      setIsEnabled(enabled);
      setConfig(pushNotificationService.getConfig());
      setPermission(pushNotificationService.getPermissionStatus());
      return enabled;
    } catch (error) {
      console.error('Error inicializando notificaciones push:', error);
      return false;
    }
  }, []);

  return {
    isSupported,
    isEnabled,
    permission,
    config,
    requestPermission,
    subscribe,
    unsubscribe,
    updateConfig,
    sendTestNotification,
    initialize
  };
};
