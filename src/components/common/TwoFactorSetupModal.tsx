import React, { useState, useEffect, useCallback } from 'react';
import { X, Smartphone, Download, Copy, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { TwoFactorAuthService, TwoFactorSecret } from '../../services/twoFactorAuthService';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const { userData } = useAuthStore();
  const [currentStep, setCurrentStep] = useState<'setup' | 'verify' | 'backup'>('setup');
  const [isLoading, setIsLoading] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState<TwoFactorSecret | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [currentTOTPCode, setCurrentTOTPCode] = useState<string>('');

  const generateNewSecret = useCallback(async () => {
    if (!userData?.email) return;
    
    try {
      const secret = await TwoFactorAuthService.generateSecret(userData.email);
      setTwoFactorSecret(secret);
    } catch (error) {
      console.error('Error generando secreto 2FA:', error);
      toast.error('Error generando secreto 2FA');
    }
  }, [userData?.email]);

  // Generar secreto cuando se abre el modal
  useEffect(() => {
    if (isOpen && !twoFactorSecret) {
      generateNewSecret();
    }
  }, [isOpen, twoFactorSecret, generateNewSecret]);

  // Actualizar código TOTP cada segundo
  useEffect(() => {
    if (!twoFactorSecret?.secret) return;

    const updateCode = async () => {
      try {
        const code = await TwoFactorAuthService.getCurrentCode(twoFactorSecret.secret);
        setCurrentTOTPCode(code);
      } catch (error) {
        console.error('Error actualizando código TOTP:', error);
        setCurrentTOTPCode('------');
      }
    };

    updateCode(); // Código inicial
    const interval = setInterval(updateCode, 1000); // Actualizar cada segundo

    return () => clearInterval(interval);
  }, [twoFactorSecret?.secret]);

  const handleVerification = async () => {
    if (!twoFactorSecret || !userData?.uid) return;

    // Validar formato del código
    if (!TwoFactorAuthService.validateTOTPCode(verificationCode)) {
      toast.error('El código debe tener 6 dígitos numéricos');
      return;
    }

    setIsLoading(true);
    try {
      // Verificar el código
      const isValid = await TwoFactorAuthService.verifyCode(
        twoFactorSecret.secret, 
        verificationCode
      );

      if (!isValid) {
        toast.error('Código incorrecto. Intenta de nuevo.');
        return;
      }

      // Activar 2FA
      await TwoFactorAuthService.enableTwoFactor(
        userData.uid,
        twoFactorSecret.secret,
        twoFactorSecret.backupCodes
      );

      toast.success('¡Autenticación de dos factores activada!');
      setCurrentStep('backup');
      
    } catch (error) {
      console.error('Error activando 2FA:', error);
      toast.error('Error activando 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  const downloadBackupCodes = () => {
    if (!twoFactorSecret) return;

    const content = `Códigos de Respaldo - SodAsist\n\n` +
      `Guarda estos códigos en un lugar seguro. ` +
      `Puedes usarlos para acceder a tu cuenta si pierdes tu dispositivo.\n\n` +
      twoFactorSecret.backupCodes.map((code, index) => 
        `${index + 1}. ${code}`
      ).join('\n') + `\n\n` +
      `Fecha de generación: ${new Date().toLocaleDateString()}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'codigos-respaldo-2fa.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Códigos de respaldo descargados');
  };

  const handleFinish = () => {
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Smartphone className="h-6 w-6 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Configurar Autenticación de Dos Factores
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep === 'setup' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className={`w-16 h-1 ${
                currentStep === 'verify' || currentStep === 'backup' ? 'bg-blue-600' : 'bg-gray-200'
              }`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep === 'verify' ? 'bg-blue-600 text-white' : 
                currentStep === 'backup' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <div className={`w-16 h-1 ${
                currentStep === 'backup' ? 'bg-blue-600' : 'bg-gray-200'
              }`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep === 'backup' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                3
              </div>
            </div>
          </div>

          {/* Step 1: Setup */}
          {currentStep === 'setup' && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium">¿Qué necesitas hacer?</p>
                    <ol className="mt-2 space-y-1 list-decimal list-inside">
                      <li>Instala Google Authenticator o una app similar</li>
                      <li>Escanea el código QR o ingresa la clave manualmente</li>
                      <li>Verifica el código generado por la app</li>
                    </ol>
                  </div>
                </div>
              </div>

              {twoFactorSecret && (
                <div className="space-y-4">
                  {/* Código QR */}
                  <div className="text-center">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      Escanea este código QR
                    </h4>
                    <div className="inline-block p-4 bg-white rounded-lg border">
                      <img 
                        src={twoFactorSecret.qrCodeUrl} 
                        alt="Código QR 2FA" 
                        className="w-48 h-48"
                      />
                    </div>
                  </div>

                  {/* Clave Manual */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      O ingresa esta clave manualmente
                    </h4>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border font-mono text-sm">
                        <span className={showSecret ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>
                          {showSecret ? twoFactorSecret.secret : '••••••••••••••••••••••••••••••••'}
                        </span>
                      </div>
                      <button
                        onClick={() => setShowSecret(!showSecret)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(twoFactorSecret.secret)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Código TOTP Actual */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      Código TOTP actual (para verificar)
                    </h4>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-center">
                        <div className="text-2xl font-mono font-bold text-green-600 dark:text-green-400">
                          {currentTOTPCode || '------'}
                        </div>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          Este código cambia cada 30 segundos
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setCurrentStep('verify')}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Continuar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Verification */}
          {currentStep === 'verify' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium">Verificación:</p>
                    <p>Ingresa el código de 6 dígitos que aparece en tu app de autenticación.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Código de Verificación
                  </label>
                  <input
                    type="text"
                    id="verificationCode"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-center text-lg font-mono"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setCurrentStep('setup')}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={handleVerification}
                    disabled={isLoading || verificationCode.length !== 6}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Verificar y Activar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Backup Codes */}
          {currentStep === 'backup' && (
            <div className="space-y-6">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-start space-x-2">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-green-800 dark:text-green-200">
                    <p className="font-medium">¡2FA Activado!</p>
                    <p>Ahora configura tus códigos de respaldo para mayor seguridad.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Códigos de Respaldo
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Guarda estos códigos en un lugar seguro. Puedes usarlos para acceder a tu cuenta si pierdes tu dispositivo.
                </p>

                {twoFactorSecret && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-2">
                      {twoFactorSecret.backupCodes.map((code, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-600 rounded border">
                          <span className="text-sm font-mono">{code}</span>
                          <button
                            onClick={() => copyToClipboard(code)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={downloadBackupCodes}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar Códigos
                  </button>
                  <button
                    onClick={handleFinish}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Finalizar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
