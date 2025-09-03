import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  console.log('🚀 AuthProvider: Iniciando');
  useAuth(); // Este hook maneja la suscripción a los cambios de autenticación
  const { loading, initialized } = useAuthStore();
  
  console.log('🔍 AuthProvider: Estado de autenticación:', {
    loading,
    initialized
  });

  if (!initialized || loading) {
    console.log('⏳ AuthProvider: Mostrando spinner de carga');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  console.log('✅ AuthProvider: Autenticación inicializada, renderizando children');
  return <>{children}</>;
}; 