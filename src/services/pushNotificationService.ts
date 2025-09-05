import { 
  getToken, 
  onMessage, 
  MessagePayload,
  Messaging 
} from 'firebase/messaging';
import { messaging } from '../config/firebase';
import { useAuthStore } from '../store/authStore';
import { notificationService } from './notificationService';
import toast from 'react-hot-toast';

// Configuración del Service Worker
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

interface PushNotificationConfig {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  showInSystemTray: boolean;
}

// Interface para datos de notificaciones push (usada internamente)
// Nota: Esta interfaz se puede usar en el futuro para tipado de notificaciones

class PushNotificationService {
  private messagingInstance: Messaging | null = null;
  private isInitialized = false;
  private config: PushNotificationConfig = {
    enabled: false,
    sound: true,
    vibration: true,
    showInSystemTray: true
  };

  // Inicializar el servicio
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return this.config.enabled;
    }

    try {
      // Verificar si FCM está soportado
      const messagingSupported = await messaging;
      if (!messagingSupported) {
        console.warn('Firebase Cloud Messaging no está soportado en este navegador');
        return false;
      }

      this.messagingInstance = messagingSupported;

      // Cargar configuración del usuario
      await this.loadUserConfig();

      // Configurar listeners
      this.setupMessageListener();

      this.isInitialized = true;
      return this.config.enabled;
    } catch (error) {
      console.error('Error inicializando Push Notification Service:', error);
      return false;
    }
  }

  // Cargar configuración del usuario desde localStorage
  private async loadUserConfig(): Promise<void> {
    const { user } = useAuthStore.getState();
    if (!user?.email) {
      return;
    }

    const savedConfig = localStorage.getItem(`pushConfig_${user.email}`);
    if (savedConfig) {
      this.config = { ...this.config, ...JSON.parse(savedConfig) };
    }
  }

  // Guardar configuración del usuario
  private async saveUserConfig(): Promise<void> {
    const { user } = useAuthStore.getState();
    if (!user?.email) {
      return;
    }

    localStorage.setItem(`pushConfig_${user.email}`, JSON.stringify(this.config));
  }

  // Solicitar permisos de notificación
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones');
      toast.error('Tu navegador no soporta notificaciones');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.config.enabled = true;
      await this.saveUserConfig();
      return true;
    }

    if (Notification.permission === 'denied') {
      toast.error('Las notificaciones están bloqueadas. Por favor, habilítalas en la configuración del navegador.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        this.config.enabled = true;
        await this.saveUserConfig();
        toast.success('Notificaciones habilitadas correctamente');
        return true;
      } else {
        toast.error('Permisos de notificación denegados');
        return false;
      }
    } catch (error) {
      console.error('Error solicitando permisos:', error);
      toast.error('Error al solicitar permisos de notificación');
      return false;
    }
  }

  // Obtener token FCM
  async getFCMToken(): Promise<string | null> {
    if (!this.messagingInstance || !VAPID_KEY) {
      console.warn('FCM no está configurado correctamente');
      return null;
    }

    try {
      const token = await getToken(this.messagingInstance, {
        vapidKey: VAPID_KEY
      });

      if (token) {
        console.log('FCM Token obtenido:', token);
        return token;
      } else {
        console.warn('No se pudo obtener el token FCM');
        return null;
      }
    } catch (error) {
      console.error('Error obteniendo token FCM:', error);
      return null;
    }
  }

  // Configurar listener para mensajes en primer plano
  private setupMessageListener(): void {
    if (!this.messagingInstance) {
      return;
    }

    onMessage(this.messagingInstance, (payload: MessagePayload) => {
      console.log('Mensaje recibido en primer plano:', payload);
      
      // Mostrar notificación en la aplicación
      this.showInAppNotification(payload);
      
      // Mostrar notificación del sistema si está habilitada
      if (this.config.showInSystemTray) {
        this.showSystemNotification(payload);
      }
    });
  }

  // Mostrar notificación en la aplicación (toast)
  private showInAppNotification(payload: MessagePayload): void {
    const notification = payload.notification;
    if (notification) {
      toast.success(notification.title || 'Nueva notificación', {
        duration: 5000
      });
    }
  }

  // Mostrar notificación del sistema
  private showSystemNotification(payload: MessagePayload): void {
    if (!this.config.enabled || Notification.permission !== 'granted') {
      return;
    }

    const notification = payload.notification;
    if (!notification) {
      return;
    }

    const notificationOptions: NotificationOptions = {
      body: notification.body,
      icon: notification.icon || '/Logo.png',
      tag: payload.data?.tag || 'sodasist-notification',
      data: payload.data,
      requireInteraction: payload.data?.priority === 'high',
      silent: !this.config.sound
    };

    // Agregar vibración si está habilitada (propiedad no estándar)
    if (this.config.vibration) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (notificationOptions as any).vibrate = [200, 100, 200];
    }

    // Agregar acciones si están disponibles (propiedad no estándar)
    if (payload.data?.actionUrl) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (notificationOptions as any).actions = [
        {
          action: 'open',
          title: 'Abrir',
          icon: '/Logo.png'
        },
        {
          action: 'dismiss',
          title: 'Descartar'
        }
      ];
    }

    const systemNotification = new Notification(
      notification.title || 'SodAsist',
      notificationOptions
    );

    // Manejar clics en la notificación
    systemNotification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      
      if (payload.data?.actionUrl) {
        window.location.href = payload.data.actionUrl;
      }
      
      systemNotification.close();
    };

    // Auto-cerrar después de 10 segundos
    setTimeout(() => {
      systemNotification.close();
    }, 10000);
  }

  // Enviar notificación push (para testing)
  async sendTestNotification(): Promise<void> {
    const { user } = useAuthStore.getState();
    if (!user?.email) {
      toast.error('Usuario no autenticado');
      return;
    }

    try {
      // Crear notificación en el sistema
      await notificationService.createSystemNotification({
        type: 'info',
        priority: 'medium',
        title: 'Notificación de Prueba',
        message: 'Esta es una notificación de prueba del sistema de notificaciones push',
        category: 'sistema',
        dismissible: true,
        userId: user.email
      });

      toast.success('Notificación de prueba enviada');
    } catch (error) {
      console.error('Error enviando notificación de prueba:', error);
      toast.error('Error al enviar notificación de prueba');
    }
  }

  // Configurar notificaciones del usuario
  async updateConfig(newConfig: Partial<PushNotificationConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await this.saveUserConfig();
    
    if (newConfig.enabled !== undefined) {
      if (newConfig.enabled) {
        await this.requestPermission();
      } else {
        toast.success('Notificaciones deshabilitadas');
      }
    }
  }

  // Obtener configuración actual
  getConfig(): PushNotificationConfig {
    return { ...this.config };
  }

  // Verificar si las notificaciones están habilitadas
  isEnabled(): boolean {
    return this.config.enabled && Notification.permission === 'granted';
  }

  // Obtener estado de permisos
  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }

  // Suscribir a notificaciones (registrar token en el servidor)
  async subscribeToNotifications(): Promise<boolean> {
    if (!this.isEnabled()) {
      const granted = await this.requestPermission();
      if (!granted) {
        return false;
      }
    }

    const token = await this.getFCMToken();
    if (!token) {
      toast.error('No se pudo obtener el token de notificaciones');
      return false;
    }

    // Aquí deberías enviar el token al servidor para suscribir al usuario
    // Por ahora, solo lo guardamos en localStorage
    const { user } = useAuthStore.getState();
    if (user?.email) {
      localStorage.setItem(`fcmToken_${user.email}`, token);
      toast.success('Notificaciones activadas correctamente');
      return true;
    }

    return false;
  }

  // Desuscribir de notificaciones
  async unsubscribeFromNotifications(): Promise<void> {
    const { user } = useAuthStore.getState();
    if (user?.email) {
      localStorage.removeItem(`fcmToken_${user.email}`);
    }
    
    this.config.enabled = false;
    await this.saveUserConfig();
    toast.success('Notificaciones desactivadas');
  }
}

export const pushNotificationService = new PushNotificationService();
