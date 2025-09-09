import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  AuthError,
  AuthErrorCodes 
} from 'firebase/auth';
import { auth } from '../../config/firebase';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Logo } from '../common/Logo';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';

import toast from 'react-hot-toast';
import { PlanSelection } from './PlanSelection';

const schema = yup.object().shape({
  email: yup.string().email('Email inválido').required('Email requerido'),
  password: yup.string().min(6, 'Mínimo 6 caracteres').required('Contraseña requerida'),
});

type LoginFormData = yup.InferType<typeof schema>;

export const LoginForm: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'individual' | 'business' | 'enterprise'>('individual');
  
  const { user } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(schema),
  });

  // Redirigir automáticamente cuando el usuario se autentica exitosamente
  useEffect(() => {
    // Para registro exitoso, redirigir inmediatamente cuando se tenga el usuario
    if (user && loginSuccess && isRegistering) {
      toast.success('¡Bienvenido! Redirigiendo al dashboard...', { duration: 2000 });
      
      // Redirección simple y directa para usuarios registrados
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    }
    // Para login exitoso, redirigir cuando se tenga el usuario
    else if (user && loginSuccess && !isRegistering) {
      toast.success('Sesión iniciada correctamente', { duration: 2000 });
      
      // Redirección simple y directa para usuarios que inician sesión
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    }
  }, [user, loginSuccess, isRegistering]);

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setLoginSuccess(false);
    try {
      if (isRegistering) {
        // Guardar el plan seleccionado en localStorage para que useAuth lo pueda usar
        localStorage.setItem('selectedPlan', selectedPlan);
        
        // Registrar nuevo usuario en Firebase Auth
        await createUserWithEmailAndPassword(auth, data.email, data.password);
        
        // El listener de useAuth se encargará de crear el documento con el plan seleccionado
        toast.success(`Usuario registrado correctamente con plan ${selectedPlan}. Redirigiendo...`, { duration: 3000 });
        setLoginSuccess(true);

        // Timeout de respaldo para redirección (en caso de que useAuth no funcione)
        setTimeout(() => {
          if (!user) {
            toast.success('Redirigiendo al dashboard...', { duration: 2000 });
            window.location.href = '/';
          }
        }, 5000);
      } else {
        // Iniciar sesión
        await signInWithEmailAndPassword(auth, data.email, data.password);
        toast.success('Sesión iniciada correctamente');
        setLoginSuccess(true);
        
        // Redirección inmediata para login
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      }
    } catch (err: unknown) {
      let errorMessage = 'Error en la autenticación';
      
      if (err instanceof Error) {
        // Verificar si es un error de email duplicado de nuestro sistema
        if (err.message.includes('Ya existe una cuenta registrada con el email')) {
          errorMessage = err.message;
        } else if ('code' in err) {
          const authError = err as AuthError;
          
          switch (authError.code) {
            case AuthErrorCodes.EMAIL_EXISTS:
              errorMessage = 'Este email ya está registrado. Por favor, inicia sesión con tu cuenta existente.';
              break;
            case AuthErrorCodes.USER_DELETED:
              errorMessage = 'Usuario no encontrado';
              break;
            case AuthErrorCodes.INVALID_PASSWORD:
              errorMessage = 'Contraseña incorrecta';
              break;
            case AuthErrorCodes.INVALID_EMAIL:
              errorMessage = 'Email inválido';
              break;
            default:
              errorMessage = err.message;
          }
        } else {
          errorMessage = err.message;
        }
      }
      
      toast.error(errorMessage);
      console.error('Error de autenticación:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setLoginSuccess(false);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('Sesión iniciada con Google');
      setLoginSuccess(true);
      
      // Redirección inmediata para Google
      setTimeout(() => {
        console.log('🚀 Redirección inmediata - Google');
        window.location.href = '/';
      }, 1000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      toast.error('Error al iniciar sesión con Google: ' + errorMessage);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handlePlanChange = (planId: string) => {
    setSelectedPlan(planId as 'individual' | 'business' | 'enterprise');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            VaListo
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {isRegistering ? 'Crear nueva cuenta' : 'Gestión profesional de entregas'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="email" className="sr-only">
              Correo electrónico
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className="appearance-none rounded-lg relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Correo electrónico"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="sr-only">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                className="appearance-none rounded-lg relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Contraseña"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
            )}
          </div>

          {/* Selección de Plan - Solo mostrar durante el registro */}
          {isRegistering && (
            <div className="mt-6">
              <PlanSelection
                selectedPlan={selectedPlan}
                onPlanChange={handlePlanChange}
                isFirstUser={true}
              />
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || (loginSuccess && !!user)}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : loginSuccess && user ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Redirigiendo...</span>
                </>
              ) : (
                isRegistering ? 'Registrarse' : 'Iniciar Sesión'
              )}
            </button>
          </div>

          {/* Botón manual de redirección si el login fue exitoso */}
          {loginSuccess && user && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  console.log('🔘 Botón manual clickeado');
                  window.location.href = window.location.origin + '/';
                }}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                🏠 Ir al Dashboard Manualmente
              </button>
            </div>
          )}

          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500">O continúa con</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || (loginSuccess && !!user)}
                className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
              >
                {googleLoading ? (
                  <LoadingSpinner size="sm" />
                ) : loginSuccess && user ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Redirigiendo...</span>
                  </>
                ) : (
                  'Google'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};