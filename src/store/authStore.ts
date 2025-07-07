import { create } from 'zustand';
import { User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,
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