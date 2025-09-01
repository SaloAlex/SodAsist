import React, { useState } from 'react';
import { X, UserPlus, Mail, Shield, Users, UserCheck } from 'lucide-react';
import { EmployeeManagementService, EmployeeInvitation } from '../../services/employeeManagementService';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface InviteEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const InviteEmployeeModal: React.FC<InviteEmployeeModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { userData } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    nombre: '',
    rol: 'sodero' as 'admin' | 'manager' | 'sodero'
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userData?.tenantId) {
      toast.error('No se pudo identificar el tenant');
      return;
    }

    setIsLoading(true);
    
    try {
      const invitation: EmployeeInvitation = {
        email: formData.email,
        nombre: formData.nombre,
        rol: formData.rol,
        tenantId: userData.tenantId,
        invitedBy: userData.uid,
        invitedAt: new Date()
      };

      const success = await EmployeeManagementService.inviteEmployee(invitation);
      
      if (success) {
        onSuccess();
        onClose();
        setFormData({ email: '', nombre: '', rol: 'sodero' });
      }
    } catch (error) {
      console.error('Error invitando empleado:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      setFormData({ email: '', nombre: '', rol: 'sodero' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <UserPlus className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Invitar Empleado
            </h3>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email del empleado
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="empleado@empresa.com"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nombre completo
            </label>
            <div className="relative">
              <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Nombre y apellido"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Rol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rol del empleado
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'admin', label: 'Admin', icon: Shield, description: 'Acceso completo' },
                { value: 'manager', label: 'Manager', icon: Users, description: 'Gestión de equipo' },
                { value: 'sodero', label: 'Sodero', icon: UserCheck, description: 'Operaciones' }
              ].map((role) => {
                const Icon = role.icon;
                return (
                  <label
                    key={role.value}
                    className={`relative cursor-pointer border-2 rounded-lg p-3 transition-all ${
                      formData.rol === role.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rol"
                      value={role.value}
                      checked={formData.rol === role.value}
                      onChange={(e) => setFormData({ ...formData, rol: e.target.value as any })}
                      className="sr-only"
                      disabled={isLoading}
                    />
                    <div className="text-center">
                      <Icon className={`h-6 w-6 mx-auto mb-2 ${
                        formData.rol === role.value ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        {role.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {role.description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invitar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
