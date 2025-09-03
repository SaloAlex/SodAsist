import React, { useState } from 'react';
import { X, Smartphone, Check, AlertTriangle } from 'lucide-react';
import { TwoFactorAuthService } from '../../services/twoFactorAuthService';
import toast from 'react-hot-toast';

interface TwoFactorVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  secret: string;
  backupCodes: string[];
}

export const TwoFactorVerificationModal: React.FC<TwoFactorVerificationModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  userId,
  secret,
  backupCodes
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [showBackupInput, setShowBackupInput] = useState(false);

  const handleVerification = async () => {
    if (!verificationCode.trim()) {
      toast.error('Por favor ingresa un código');
      return;
    }

    setIsLoading(true);
    try {
      let isValid = false;

      if (useBackupCode) {
        // Verificar código de respaldo
        isValid = TwoFactorAuthService.verifyBackupCode(backupCodes, verificationCode);
        if (isValid) {
          // Remover el código de respaldo usado
          const updatedBackupCodes = backupCodes.filter(code => code !== verificationCode.toUpperCase());
          await TwoFactorAuthService.updateBackupCodes(userId, updatedBackupCodes);
          toast.success('Código de respaldo verificado correctamente');
        }
      } else {
        // Verificar código TOTP
        if (!TwoFactorAuthService.validateTOTPCode(verificationCode)) {
          toast.error('El código debe tener 6 dígitos numéricos');
          setIsLoading(false);
          return;
        }
        
        isValid = await TwoFactorAuthService.verifyCode(secret, verificationCode);
      }

      if (isValid) {
        toast.success('Verificación exitosa');
        onSuccess();
      } else {
        toast.error(useBackupCode ? 'Código de respaldo incorrecto' : 'Código incorrecto');
      }
    } catch (error) {
      console.error('Error durante la verificación:', error);
      toast.error('Error durante la verificación');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupCodeToggle = () => {
    setUseBackupCode(!useBackupCode);
    setShowBackupInput(!showBackupInput);
    setVerificationCode('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerification();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Smartphone className="h-6 w-6 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Verificación de Dos Factores
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Información */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800 mb-6">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium">Verificación requerida:</p>
                <p>Ingresa el código de 6 dígitos de tu app de autenticación o usa un código de respaldo.</p>
              </div>
            </div>
          </div>

          {/* Toggle para código de respaldo */}
          <div className="mb-4">
            <button
              onClick={handleBackupCodeToggle}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {useBackupCode ? 'Usar código TOTP' : 'Usar código de respaldo'}
            </button>
          </div>

          {/* Input del código */}
          <div className="space-y-4">
            <div>
              <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {useBackupCode ? 'Código de Respaldo' : 'Código de Verificación'}
              </label>
              <input
                type="text"
                id="verificationCode"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={useBackupCode ? 'ABCD1234' : '000000'}
                maxLength={useBackupCode ? 8 : 6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-center text-lg font-mono"
                autoFocus
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {useBackupCode 
                  ? 'Ingresa uno de tus códigos de respaldo de 8 caracteres'
                  : 'Ingresa el código de 6 dígitos de tu app de autenticación'
                }
              </p>
            </div>

            {/* Botones */}
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleVerification}
                disabled={isLoading || !verificationCode.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Verificar
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Información adicional */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ¿Problemas con tu app de autenticación? 
              <button
                onClick={handleBackupCodeToggle}
                className="text-blue-600 hover:text-blue-700 ml-1"
              >
                Usa un código de respaldo
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
