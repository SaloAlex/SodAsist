import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  UserCheck, 
  MoreVertical, 
  Edit, 
  Trash2,
  Mail,
  Calendar
} from 'lucide-react';
import { EmployeeManagementService } from '../../services/employeeManagementService';
import { InviteEmployeeModal } from './InviteEmployeeModal';
import { useAuthStore } from '../../store/authStore';
import { User } from '../../types';
import toast from 'react-hot-toast';

export const EmployeeManagement: React.FC = () => {
  const { userData } = useAuthStore();
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);

  useEffect(() => {
    if (userData?.tenantId) {
      loadEmployees();
    }
  }, [userData?.tenantId]);

  const loadEmployees = async () => {
    if (!userData?.tenantId) return;
    
    setIsLoading(true);
    try {
      const employeeList = await EmployeeManagementService.getEmployees(userData.tenantId);
      setEmployees(employeeList);
    } catch (error) {
      console.error('Error cargando empleados:', error);
      toast.error('Error al cargar empleados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (employee: User, newRole: 'admin' | 'manager' | 'sodero') => {
    try {
      const success = await EmployeeManagementService.changeEmployeeRole(employee.uid, newRole);
      if (success) {
        await loadEmployees();
        setEditingEmployee(null);
      }
    } catch (error) {
      console.error('Error cambiando rol:', error);
    }
  };

  const handleRemoveEmployee = async (employee: User) => {
    if (!userData?.tenantId) return;
    
    if (window.confirm(`¿Estás seguro de que quieres remover a ${employee.nombre}?`)) {
      try {
        const success = await EmployeeManagementService.removeEmployee(employee.uid, userData.tenantId);
        if (success) {
          await loadEmployees();
        }
      } catch (error) {
        console.error('Error removiendo empleado:', error);
      }
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4 text-red-500" />;
      case 'manager': return <Users className="h-4 w-4 text-blue-500" />;
      case 'sodero': return <UserCheck className="h-4 w-4 text-green-500" />;
      default: return <UserCheck className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Manager';
      case 'sodero': return 'Sodero';
      default: return role;
    }
  };

  const getStatusBadge = (isActive: boolean | undefined) => {
    if (isActive === false) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          Inactivo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        Activo
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-8 w-8 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Gestión de Empleados
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {employees.length} empleado{employees.length !== 1 ? 's' : ''} en tu equipo
            </p>
          </div>
        </div>
        

      </div>

      {/* Employee List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        {employees.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No hay empleados aún
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Invita a tu primer empleado para comenzar a trabajar en equipo
            </p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invitar Primer Empleado
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Empleado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Fecha de Ingreso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {employees.map((employee) => (
                  <tr key={employee.uid} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                              {employee.nombre.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {employee.nombre}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {employee.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getRoleIcon(employee.rol)}
                        <span className="ml-2 text-sm text-gray-900 dark:text-white">
                          {getRoleLabel(employee.rol)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(employee.isActive)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {employee.createdAt ? new Date(employee.createdAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative">
                        <button
                          onClick={() => setShowActionsMenu(showActionsMenu === employee.uid ? null : employee.uid)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        
                        {showActionsMenu === employee.uid && (
                          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-700">
                            <button
                              onClick={() => {
                                setEditingEmployee(employee);
                                setShowActionsMenu(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Cambiar Rol
                            </button>
                            <button
                              onClick={() => {
                                handleRemoveEmployee(employee);
                                setShowActionsMenu(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remover
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Change Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Cambiar Rol de {editingEmployee.nombre}
              </h3>
              
              <div className="space-y-3 mb-6">
                {(['admin', 'manager', 'sodero'] as const).map((role) => (
                  <label
                    key={role}
                    className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      editingEmployee.rol === role
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      checked={editingEmployee.rol === role}
                      onChange={() => setEditingEmployee({ ...editingEmployee, rol: role })}
                      className="mr-3"
                    />
                    <div className="flex items-center">
                      {getRoleIcon(role)}
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {getRoleLabel(role)}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setEditingEmployee(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleRoleChange(editingEmployee, editingEmployee.rol)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Employee Modal */}
      <InviteEmployeeModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={loadEmployees}
      />
    </div>
  );
};
