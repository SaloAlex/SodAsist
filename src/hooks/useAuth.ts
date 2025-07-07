import { useEffect, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuthStore } from '../store/authStore';
import { FirebaseService } from '../services/firebaseService';
import { User } from '../types';
import toast from 'react-hot-toast';

export const useAuth = () => {
  const { 
    setUser, 
    setUserData, 
    setLoading, 
    setError, 
    setInitialized,
    loading,
    initialized
  } = useAuthStore();

  const handleAuthStateChanged = useCallback(async (firebaseUser: FirebaseUser | null) => {
    try {
      setUser(firebaseUser);
      
      if (!firebaseUser) {
        setUserData(null);
        return;
      }

      // Try to get user data from Firestore
      let userData = await FirebaseService.getDocument<User>('users', firebaseUser.uid);
      
      // If user doesn't exist in Firestore, create it
      if (!userData) {
        const isFirstUser = await FirebaseService.isFirstUser();

        const newUserData: Omit<User, 'id'> = {
          uid: firebaseUser.uid,
          nombre: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
          email: firebaseUser.email || '',
          rol: isFirstUser ? 'admin' : 'sodero',
          createdAt: new Date(),
        };
        
        try {
          await FirebaseService.createUserDocument(newUserData);
          userData = { ...newUserData, id: firebaseUser.uid };
          toast.success('Usuario creado correctamente');
        } catch (err) {
          console.error('Error creating user document:', err);
          toast.error('Error al crear el usuario en la base de datos');
          setError('Error al crear el usuario en la base de datos');
          return;
        }
      }
      
      setUserData(userData);
    } catch (err) {
      console.error('Error loading user data:', err);
      toast.error('Error al cargar datos del usuario');
      setError('Error al cargar datos del usuario');
    }
  }, [setUser, setUserData, setError]);

  useEffect(() => {
    if (initialized) {
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        setLoading(true);
        await handleAuthStateChanged(user);
        setLoading(false);
        setInitialized(true);
      },
      (error) => {
        console.error('Auth state change error:', error);
        setError(error.message);
        setLoading(false);
        setInitialized(true);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [initialized, setLoading, setError, setInitialized, handleAuthStateChanged]);
};