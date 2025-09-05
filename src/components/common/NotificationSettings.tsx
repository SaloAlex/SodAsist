import React, { useState } from 'react';
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Vibrate,
  Smartphone,
  Settings,
  TestTube,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import toast from 'react-hot-toast';

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  isOpen,
  onClose
}) => {
  const {
    isSupported,
    isEnabled,
    permission,
    config,
    requestPermission,
    subscribe,
    unsubscribe,
    updateConfig,
    sendTestNotification
  } = usePushNotifications();

  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleToggleNotifications = async () => {
    setLoading(true);
    try {
      if (isEnabled) {
        await unsubscribe();
      } else {
        if (permission === 'default') {
          const granted = await requestPermission();
          if (granted) {
            await subscribe();
          }
        } else if (permission === 'granted') {
          await subscribe();
        } else {
          toast.error('Las notificaciones están bloqueadas. Por favor, habilítalas en la configuración del navegador.');
        }
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = async (key: keyof typeof config, value: boolean) => {
    try {
      await updateConfig({ [key]: value });
    } catch (error) {
      console.error('Error updating config:', error);
    }
  };

  const handleTestNotification = async () => {
    setLoading(true);
    try {
      await sendTestNotification();
    } catch (error) {
      console.error('Error sending test notification:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return { text: 'Permitido', color: 'text-green-600 dark:text-green-400', icon: Check };
      case 'denied':
        return { text: 'Denegado', color: 'text-red-600 dark:text-red-400', icon: X };
      default:
        return { text: 'No solicitado', color: 'text-yellow-600 dark:text-yellow-400', icon: AlertCircle };
    }
  };

  const permissionStatus = getPermissionStatus();
  const StatusIcon = permissionStatus.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Notificaciones
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configura cómo recibir notificaciones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Soporte del navegador */}
          {!isSupported && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-sm text-red-800 dark:text-red-200">
                  Tu navegador no soporta notificaciones push
                </p>
              </div>
            </div>
          )}

          {isSupported && (
            <>
              {/* Estado de permisos */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <StatusIcon className={`h-5 w-5 mr-2 ${permissionStatus.color}`} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Estado de permisos
                    </span>
                  </div>
                  <span className={`text-sm font-medium ${permissionStatus.color}`}>
                    {permissionStatus.text}
                  </span>
                </div>
              </div>

              {/* Toggle principal */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {isEnabled ? (
                    <Bell className="h-5 w-5 text-green-600 dark:text-green-400 mr-3" />
                  ) : (
                    <BellOff className="h-5 w-5 text-gray-400 mr-3" />
                  )}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Notificaciones Push
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Recibir notificaciones del sistema
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleNotifications}
                  disabled={loading || permission === 'denied'}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Configuraciones avanzadas */}
              {isEnabled && (
                <div className="space-y-4">
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                      Configuraciones avanzadas
                    </h4>
                    
                    <div className="space-y-3">
                      {/* Sonido */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {config.sound ? (
                            <Volume2 className="h-4 w-4 text-gray-600 dark:text-gray-400 mr-3" />
                          ) : (
                            <VolumeX className="h-4 w-4 text-gray-400 mr-3" />
                          )}
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Sonido
                          </span>
                        </div>
                        <button
                          onClick={() => handleConfigChange('sound', !config.sound)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            config.sound ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              config.sound ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Vibración */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Vibrate className="h-4 w-4 text-gray-600 dark:text-gray-400 mr-3" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Vibración
                          </span>
                        </div>
                        <button
                          onClick={() => handleConfigChange('vibration', !config.vibration)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            config.vibration ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              config.vibration ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Mostrar en bandeja del sistema */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Smartphone className="h-4 w-4 text-gray-600 dark:text-gray-400 mr-3" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Mostrar en bandeja del sistema
                          </span>
                        </div>
                        <button
                          onClick={() => handleConfigChange('showInSystemTray', !config.showInSystemTray)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            config.showInSystemTray ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              config.showInSystemTray ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Botón de prueba */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <button
                      onClick={handleTestNotification}
                      disabled={loading}
                      className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      {loading ? 'Enviando...' : 'Enviar notificación de prueba'}
                    </button>
                  </div>
                </div>
              )}

              {/* Instrucciones para permisos denegados */}
              {permission === 'denied' && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        Las notificaciones están bloqueadas. Para habilitarlas:
                      </p>
                      <ol className="text-xs text-yellow-700 dark:text-yellow-300 mt-2 ml-4 list-decimal">
                        <li>Haz clic en el icono de candado en la barra de direcciones</li>
                        <li>Selecciona "Permitir" en notificaciones</li>
                        <li>Recarga la página</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
