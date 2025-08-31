import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Package, 
  BarChart3, 
  MapPin, 
  Plus,
  Settings,
  LogOut 
} from 'lucide-react';
import { Logo } from './Logo';
import { useAuthStore } from '../../store/authStore';
import { auth } from '../../config/firebase';
import { signOut } from 'firebase/auth';
import toast from 'react-hot-toast';

interface SidebarProps {
  className?: string;
  onClose?: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Clientes', href: '/clientes', icon: Users },
  { name: 'Ruta de Hoy', href: '/ruta-hoy', icon: MapPin },
  { name: 'Nueva Entrega', href: '/entregas/new', icon: Plus },
  { name: 'Inventario', href: '/inventario', icon: Package },
  { name: 'Reportes', href: '/reportes', icon: BarChart3 },
  { name: 'Ajustes', href: '/ajustes', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ className = '', onClose }) => {
  const { setUser, setUserData } = useAuthStore();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserData(null);
      toast.success('Sesión cerrada correctamente');
    } catch {
      toast.error('Error al cerrar sesión');
    }
  };

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <aside className={`w-64 bg-white dark:bg-gray-800 shadow-sm border-r border-gray-200 dark:border-gray-700 flex flex-col ${className}`}>
      <div className="flex-none p-6">
        <Logo size="2xl" />
      </div>
      
      <nav className="flex-1 mt-6">
        <ul className="space-y-1 px-3">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex-none p-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
        >
          <LogOut className="h-5 w-5" />
            <span className="truncate">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};