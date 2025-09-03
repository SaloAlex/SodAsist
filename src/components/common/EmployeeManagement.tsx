import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  UserCheck, 
  MoreVertical, 
  Trash2
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
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
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
  }, [userData?.tenantId]);

  useEffect(() => {
    if (userData?.tenantId) {
      loadEmployees();
    }
  }, [userData?.tenantId, loadEmployees]);

  const handleRoleChange = async (employee: User, newRole: 'admin' | 'manager' | 'sodero') => {
    try {
      const success = await EmployeeManagementService.changeEmployeeRole(employee.uid, newRole);
      if (success) {
        await loadEmployees();
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

  const canManageEmployee = (employee: User) => {
    if (!userData) return false;
    
    // Solo owners y admins pueden gestionar empleados
    if (userData.rol !== 'owner' && userData.rol !== 'admin') return false;
    
    // No se puede gestionar a sí mismo
    if (employee.uid === userData.uid) return false;
    
    // Owners pueden gestionar a cualquiera
    if (userData.rol === 'owner') return true;
    
    // Admins solo pueden gestionar managers y soderos
    return employee.rol !== 'owner' && employee.rol !== 'admin';
  };

  const canChangeRole = (employee: User) => {
    if (!userData) return false;
    
    // Solo owners pueden cambiar roles
    if (userData.rol !== 'owner') return false;
    
    // No se puede cambiar el rol de sí mismo
    if (employee.uid === userData.uid) return false;
    
    return true;
  };

  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Cargando...
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestión de Empleados
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Administra los empleados de tu empresa
          </p>
        </div>
        
        {canManageEmployee({ uid: '', rol: 'sodero', tenantId: '', nombre: '', email: '', plan: 'individual', createdAt: new Date() } as User) && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invitar Empleado
          </button>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Empleados
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {employees.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Shield className="h-6 w-6 text-red-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Administradores
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {employees.filter(e => e.rol === 'admin').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Managers
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {employees.filter(e => e.rol === 'manager').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserCheck className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Soderos
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {employees.filter(e => e.rol === 'sodero').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Empleados */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
            Empleados
          </h3>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Cargando empleados...
              </p>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No hay empleados
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Comienza invitando a tu primer empleado.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden">
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
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {employees.map((employee) => (
                    <tr key={employee.uid} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {employee.nombre.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {employee.nombre}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
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
                        {employee.createdAt ? new Date(employee.createdAt).toLocaleDateString('es-ES') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {canManageEmployee(employee) && (
                          <div className="relative">
                            <button
                              onClick={() => setShowActionsMenu(showActionsMenu === employee.uid ? null : employee.uid)}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            
                            {showActionsMenu === employee.uid && (
                              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-700">
                                {canChangeRole(employee) && (
                                  <button
                                    onClick={() => handleRoleChange(employee, 'admin')}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Shield className="inline h-4 w-4 mr-2" />
                                    Hacer Admin
                                  </button>
                                )}
                                
                                {canChangeRole(employee) && (
                                  <button
                                    onClick={() => handleRoleChange(employee, 'manager')}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Users className="inline h-4 w-4 mr-2" />
                                    Hacer Manager
                                  </button>
                                )}
                                
                                {canChangeRole(employee) && (
                                  <button
                                    onClick={() => handleRoleChange(employee, 'sodero')}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <UserCheck className="inline h-4 w-4 mr-2" />
                                    Hacer Sodero
                                  </button>
                                )}
                                
                                <button
                                  onClick={() => handleRemoveEmployee(employee)}
                                  className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="inline h-4 w-4 mr-2" />
                                  Remover
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Invitación */}
      {showInviteModal && (
        <InviteEmployeeModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onSuccess={loadEmployees}
        />
      )}
    </div>
  );
};
