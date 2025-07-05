import React from 'react';
import { Bell, Settings, Sun, Moon, LogOut } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import toast from 'react-hot-toast';

export const Header: React.FC = () => {
  const { theme, toggleTheme } = useAppStore();
  const { userData, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      logout();
      toast.success('Sesión cerrada correctamente');
    } catch (error) {
      toast.error('Error al cerrar sesión');
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Sistema Sodero
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {theme === 'light' ? (
              <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Sun className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
          
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {userData?.nombre || 'Usuario'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {userData?.rol || 'Rol'}
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <LogOut className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};