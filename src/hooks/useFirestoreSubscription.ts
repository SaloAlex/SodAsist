import { useEffect, useRef, useCallback } from 'react';
import { FirebaseService } from '../services/firebaseService';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface UseFirestoreSubscriptionOptions {
  collectionName: string;
  onData: (data: any[]) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
  dependencies?: any[];
}

export const useFirestoreSubscription = <T>({
  collectionName,
  onData,
  onError,
  enabled = true,
  dependencies = []
}: UseFirestoreSubscriptionOptions) => {
  const { user, userData } = useAuthStore();
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isSubscribedRef = useRef(false);

  const handleError = useCallback((error: Error) => {
    console.error(`Error en suscripción de ${collectionName}:`, error);
    
    // Manejar errores específicos
    if (error.message.includes('permission-denied')) {
      toast.error('No tienes permisos para acceder a estos datos');
    } else if (error.message.includes('unavailable')) {
      toast.error('Servicio no disponible temporalmente');
    } else if (error.message.includes('resource-exhausted')) {
      toast.error('Límite de recursos excedido');
    } else {
      toast.error(`Error al cargar ${collectionName}`);
    }
    
    if (onError) {
      onError(error);
    }
  }, [collectionName, onError]);

  const subscribe = useCallback(() => {
    if (!enabled || !user || !userData || isSubscribedRef.current) {
      return;
    }

    try {
      console.log(`🔄 Iniciando suscripción a ${collectionName}`);
      
      unsubscribeRef.current = FirebaseService.subscribeToCollection<T>(
        collectionName,
        (data) => {
          console.log(`📊 Datos recibidos de ${collectionName}:`, data.length, 'elementos');
          onData(data);
        },
        handleError
      );
      
      isSubscribedRef.current = true;
    } catch (error) {
      console.error(`Error al crear suscripción para ${collectionName}:`, error);
      handleError(error as Error);
    }
  }, [collectionName, onData, handleError, enabled, user, userData]);

  const unsubscribe = useCallback(() => {
    if (unsubscribeRef.current) {
      try {
        console.log(`🛑 Limpiando suscripción de ${collectionName}`);
        unsubscribeRef.current();
        unsubscribeRef.current = null;
        isSubscribedRef.current = false;
      } catch (error) {
        console.error(`Error al limpiar suscripción de ${collectionName}:`, error);
      }
    }
  }, [collectionName]);

  useEffect(() => {
    subscribe();
    
    return () => {
      unsubscribe();
    };
  }, [subscribe, unsubscribe, ...dependencies]);

  // Limpiar suscripción cuando el usuario se desautentica
  useEffect(() => {
    if (!user || !userData) {
      unsubscribe();
    }
  }, [user, userData, unsubscribe]);

  return {
    isSubscribed: isSubscribedRef.current,
    unsubscribe
  };
};
