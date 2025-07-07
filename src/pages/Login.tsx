import React from 'react';
import { Navigate } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { useAuthStore } from '../store/authStore';

export const Login: React.FC = () => {
  const { user, loading } = useAuthStore();

  // Si el usuario está autenticado, redirigir al dashboard
  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  return <LoginForm />;
};