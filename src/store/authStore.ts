import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User as FirebaseUser } from 'firebase/auth';
import { User } from '../types';

interface AuthState {
  user: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  setUser: (user: FirebaseUser | null) => void;
  setUserData: (userData: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      userData: null,
      loading: true,
      setUser: (user) => set({ user }),
      setUserData: (userData) => set({ userData }),
      setLoading: (loading) => set({ loading }),
      logout: () => set({ user: null, userData: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ userData: state.userData }),
    }
  )
);