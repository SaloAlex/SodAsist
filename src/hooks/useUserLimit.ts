import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { FirebaseService } from '../services/firebaseService';
import { canAddMoreUsers, getCurrentUserPlan } from '../services/plansService';
import toast from 'react-hot-toast';

interface UseUserLimitReturn {
  canAddUser: boolean;
  limitReached: boolean;
  currentUserCount: number;
  maxUsers: number | null;
  currentPlan: string;
  loading: boolean;
  error: string | null;
  checkUserLimit: () => Promise<void>;
}

export const useUserLimit = (): UseUserLimitReturn => {
  const { userData } = useAuthStore();
  const [canAddUser, setCanAddUser] = useState(true);
  const [limitReached, setLimitReached] = useState(false);
  const [currentUserCount, setCurrentUserCount] = useState(0);
  const [maxUsers, setMaxUsers] = useState<number | null>(1);
  const [currentPlan, setCurrentPlan] = useState('individual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkUserLimit = useCallback(async () => {
    if (!userData || !userData.tenantId) {
      setError('Usuario no autenticado o sin tenant');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Obtener el conteo actual de usuarios del tenant
      const users = await FirebaseService.getCollection('users');
      const tenantUsers = users.filter((user: any) => user.tenantId === userData.tenantId);
      const userCount = tenantUsers.length;

      setCurrentUserCount(userCount);
      setCurrentPlan(userData.plan || 'individual');

      // Obtener el plan actual y sus límites
      const plan = getCurrentUserPlan(userData);
      if (plan) {
        setMaxUsers(plan.maxUsers);
        
        // Verificar si se puede agregar más usuarios
        const canAdd = canAddMoreUsers(userCount, plan.id);
        setCanAddUser(canAdd);
        setLimitReached(!canAdd);

        // Mostrar toast si se alcanzó el límite
        if (!canAdd) {
          toast.error(
            `Has alcanzado el límite de ${plan.maxUsers} usuarios en tu plan ${plan.name}. Considera hacer upgrade.`,
            { duration: 5000 }
          );
        }
      }

    } catch (err) {
      console.error('Error checking user limit:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      toast.error('Error al verificar límite de usuarios');
    } finally {
      setLoading(false);
    }
  }, [userData]);

  // Verificar límite cuando cambie el usuario o se monte el componente
  useEffect(() => {
    if (userData) {
      checkUserLimit();
    }
  }, [userData, checkUserLimit]);

  // Verificar límite cada 5 minutos para mantener sincronizado
  useEffect(() => {
    if (!userData) return;

    const interval = setInterval(checkUserLimit, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userData, checkUserLimit]);

  return {
    canAddUser,
    limitReached,
    currentUserCount,
    maxUsers,
    currentPlan,
    loading,
    error,
    checkUserLimit
  };
};
