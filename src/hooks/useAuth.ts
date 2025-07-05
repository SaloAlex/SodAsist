import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuthStore } from '../store/authStore';
import { FirebaseService } from '../services/firebaseService';
import { User } from '../types';
import toast from 'react-hot-toast';

export const useAuth = () => {
  const { setUser, setUserData, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        try {
          // Try to get user data from Firestore
          let userData = await FirebaseService.getDocument<User>('users', user.uid);
          
          // If user doesn't exist in Firestore, create it
          if (!userData) {
            // Check if this is the first user
            const isFirstUser = await FirebaseService.isFirstUser();

            const newUserData: Omit<User, 'id'> = {
              uid: user.uid,
              nombre: user.displayName || user.email?.split('@')[0] || 'Usuario',
              email: user.email || '',
              rol: isFirstUser ? 'admin' as const : 'sodero' as const,
              createdAt: new Date(),
            };
            
            try {
              await FirebaseService.createUserDocument(newUserData);
              userData = { ...newUserData, id: user.uid };
              toast.success('Usuario creado correctamente');
            } catch (err) {
              console.error('Error creating user document:', err);
              toast.error('Error al crear el usuario en la base de datos');
            }
          }
          
          setUserData(userData);
        } catch (err) {
          console.error('Error loading user data:', err);
          toast.error('Error al cargar datos del usuario');
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [setUser, setUserData, setLoading]);
};