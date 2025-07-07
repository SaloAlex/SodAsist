import { create } from 'zustand';
import { User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { User as CustomUser } from '../types';

interface AuthState {
  user: User | null;
  userData: CustomUser | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setUserData: (userData: CustomUser | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setInitialized: (initialized: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userData: null,
  loading: true,
  error: null,
  initialized: false,
  setUser: (user) => set({ user }),
  setUserData: (userData) => set({ userData }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setInitialized: (initialized) => set({ initialized }),
  initializeAuth: () => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        set({ user, loading: false });
      },
      (error) => {
        set({ error: error.message, loading: false });
      }
    );
    return unsubscribe;
  }
}));