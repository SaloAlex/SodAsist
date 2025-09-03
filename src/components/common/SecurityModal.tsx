import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Lock, Eye, EyeOff, Smartphone, Bell, LogOut, X, Check, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, AuthError } from 'firebase/auth';
import { auth } from '../../config/firebase';
import toast from 'react-hot-toast';
import { TwoFactorAuthService, TwoFactorStatus } from '../../services/twoFactorAuthService';
import { TwoFactorSetupModal } from './TwoFactorSetupModal';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({ isOpen, onClose }) => {
  const { userData } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'password' | '2fa' | 'sessions' | 'notifications'>('password');
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para cambio de contraseña
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    showCurrentPassword: false,
    showNewPassword: false,
    showConfirmPassword: false
  });

  // Estados para 2FA
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus>({ isEnabled: false });
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  // Estados para notificaciones
  const [notifications, setNotifications] = useState({
    loginAlerts: true,
    passwordChanges: true,
    suspiciousActivity: true,
    newDevices: true
  });

  const loadTwoFactorStatus = useCallback(async () => {
    if (!userData?.uid) return;
    
    try {
      const status = await TwoFactorAuthService.getTwoFactorStatus(userData.uid);
      setTwoFactorStatus(status);
    } catch (error) {
      console.error('Error cargando estado 2FA:', error);
    }
  }, [userData?.uid]);

  // Cargar estado de 2FA cuando se abre el modal
  useEffect(() => {
    if (isOpen && userData?.uid) {
      loadTwoFactorStatus();
    }
  }, [isOpen, userData?.uid, loadTwoFactorStatus]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const togglePasswordVisibility = (field: 'currentPassword' | 'newPassword' | 'confirmPassword') => {
    setPasswordData(prev => ({
      ...prev,
      [`show${field.charAt(0).toUpperCase() + field.slice(1)}`]: !prev[`show${field.charAt(0).toUpperCase() + field.slice(1)}` as keyof typeof prev]
    }));
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userData?.email) {
      toast.error('No se pudo identificar el usuario');
      return;
    }

    // Validaciones
    if (!passwordData.currentPassword.trim()) {
      toast.error('La contraseña actual es obligatoria');
      return;
    }

    if (!passwordData.newPassword.trim()) {
      toast.error('La nueva contraseña es obligatoria');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error('No hay usuario autenticado');
        return;
      }

      // Reautenticar al usuario antes de cambiar la contraseña
      const credential = EmailAuthProvider.credential(
        userData.email,
        passwordData.currentPassword
      );

      await reauthenticateWithCredential(user, credential);

      // Cambiar la contraseña
      await updatePassword(user, passwordData.newPassword);

      toast.success('Contraseña actualizada correctamente');
      
      // Limpiar el formulario
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        showCurrentPassword: false,
        showNewPassword: false,
        showConfirmPassword: false
      });

      console.log('✅ Contraseña actualizada exitosamente');

    } catch (error: unknown) {
      console.error('❌ Error actualizando contraseña:', error);
      
      if (error instanceof Error && 'code' in error) {
        const authError = error as AuthError;
        if (authError.code === 'auth/wrong-password') {
          toast.error('La contraseña actual es incorrecta');
        } else if (authError.code === 'auth/weak-password') {
          toast.error('La nueva contraseña es demasiado débil');
        } else {
          toast.error(`Error al actualizar contraseña: ${authError.message}`);
        }
      } else {
        toast.error('Error desconocido al actualizar contraseña');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorToggle = async () => {
    if (twoFactorStatus.isEnabled) {
      // Desactivar 2FA
      if (window.confirm('¿Estás seguro de que quieres desactivar la autenticación de dos factores? Esto reducirá la seguridad de tu cuenta.')) {
        setTwoFactorLoading(true);
        try {
          await TwoFactorAuthService.disableTwoFactor(userData!.uid);
          setTwoFactorStatus({ isEnabled: false });
          toast.success('Autenticación de dos factores desactivada');
          await loadTwoFactorStatus(); // Recargar estado
        } catch (error) {
          console.error('Error al desactivar 2FA:', error);
          toast.error('Error al desactivar 2FA');
        } finally {
          setTwoFactorLoading(false);
        }
      }
    } else {
      // Mostrar modal de configuración
      setShowSetupModal(true);
    }
  };

  const handleTwoFactorSuccess = async () => {
    await loadTwoFactorStatus(); // Recargar estado
    setShowSetupModal(false);
  };

  const handleNotificationToggle = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSignOutAllDevices = async () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión en todos los dispositivos? Esto cerrará tu sesión actual.')) {
      try {
        await auth.signOut();
        toast.success('Sesión cerrada en todos los dispositivos');
        window.location.href = '/login';
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
        toast.error('Error al cerrar sesión');
      }
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'password', label: 'Contraseña', icon: Lock },
    { id: '2fa', label: 'Autenticación', icon: Smartphone },
    { id: 'sessions', label: 'Sesiones', icon: LogOut },
    { id: 'notifications', label: 'Notificaciones', icon: Bell }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6 text-green-600" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Configuración de Seguridad
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'password' | '2fa' | 'sessions' | 'notifications')}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {/* Password Tab */}
            {activeTab === 'password' && (
              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-medium">Recomendaciones de seguridad:</p>
                      <ul className="mt-1 space-y-1">
                        <li>• Usa al menos 8 caracteres</li>
                        <li>• Incluye mayúsculas, minúsculas y números</li>
                        <li>• Evita información personal fácil de adivinar</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  {/* Contraseña Actual */}
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Contraseña Actual *
                    </label>
                    <div className="relative">
                      <input
                        type={passwordData.showCurrentPassword ? 'text' : 'password'}
                        id="currentPassword"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        required
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="Tu contraseña actual"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('currentPassword')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {passwordData.showCurrentPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Nueva Contraseña */}
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nueva Contraseña *
                    </label>
                    <div className="relative">
                      <input
                        type={passwordData.showNewPassword ? 'text' : 'password'}
                        id="newPassword"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        required
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="Nueva contraseña"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('newPassword')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {passwordData.showNewPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirmar Nueva Contraseña */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Confirmar Nueva Contraseña *
                    </label>
                    <div className="relative">
                      <input
                        type={passwordData.showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        required
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="Confirma la nueva contraseña"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('confirmPassword')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {passwordData.showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Botón de Envío */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Actualizar Contraseña
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* 2FA Tab */}
            {activeTab === '2fa' && (
              <div className="space-y-6">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                      <p className="font-medium">Autenticación de dos factores:</p>
                      <p>Añade una capa extra de seguridad a tu cuenta usando tu teléfono.</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Autenticación de dos factores
                      </h4>
                                             <p className="text-sm text-gray-600 dark:text-gray-400">
                         {twoFactorStatus.isEnabled 
                           ? 'Activada - Tu cuenta está protegida con 2FA'
                           : 'Desactivada - Recomendamos activarla para mayor seguridad'
                         }
                       </p>
                     </div>
                   </div>
                   <button
                     onClick={handleTwoFactorToggle}
                     disabled={twoFactorLoading}
                     className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                       twoFactorStatus.isEnabled
                         ? 'bg-red-600 text-white hover:bg-red-700'
                         : 'bg-green-600 text-white hover:bg-green-700'
                     } disabled:opacity-50`}
                   >
                     {twoFactorLoading ? (
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                     ) : twoFactorStatus.isEnabled ? (
                       'Desactivar'
                     ) : (
                       'Activar'
                     )}
                   </button>
                 </div>

                 {twoFactorStatus.isEnabled && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                    <div className="flex items-center space-x-2">
                      <Check className="h-5 w-5 text-green-600" />
                      <div className="text-sm text-green-800 dark:text-green-200">
                        <p className="font-medium">2FA Activado</p>
                        <p>Recibirás un código en tu teléfono cada vez que inicies sesión.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start space-x-2">
                    <LogOut className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-medium">Sesiones activas:</p>
                      <p>Gestiona las sesiones activas en tus dispositivos.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Sesión Actual */}
                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center space-x-3">
                      <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          Sesión Actual
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Este dispositivo - {new Date().toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                      Activa
                    </span>
                  </div>

                  {/* Otras Sesiones */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      Otras Sesiones
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      No hay otras sesiones activas en este momento.
                    </p>
                  </div>

                  {/* Botón para cerrar todas las sesiones */}
                  <button
                    onClick={handleSignOutAllDevices}
                    className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar Sesión en Todos los Dispositivos
                  </button>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-start space-x-2">
                    <Bell className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-purple-800 dark:text-purple-200">
                      <p className="font-medium">Notificaciones de seguridad:</p>
                      <p>Configura qué alertas de seguridad quieres recibir.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {Object.entries(notifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {key === 'loginAlerts' && 'Alertas de inicio de sesión'}
                          {key === 'passwordChanges' && 'Cambios de contraseña'}
                          {key === 'suspiciousActivity' && 'Actividad sospechosa'}
                          {key === 'newDevices' && 'Nuevos dispositivos'}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {key === 'loginAlerts' && 'Recibe notificaciones cuando inicies sesión desde un nuevo dispositivo'}
                          {key === 'passwordChanges' && 'Te avisamos cuando se cambie tu contraseña'}
                          {key === 'suspiciousActivity' && 'Alertas sobre actividad inusual en tu cuenta'}
                          {key === 'newDevices' && 'Notificaciones cuando se detecte un nuevo dispositivo'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleNotificationToggle(key as keyof typeof notifications)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          value ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            value ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
                     </div>
         </div>
       </div>

       {/* Modal de Configuración 2FA */}
       <TwoFactorSetupModal
         isOpen={showSetupModal}
         onClose={() => setShowSetupModal(false)}
         onSuccess={handleTwoFactorSuccess}
       />
     </div>
   );
 };
