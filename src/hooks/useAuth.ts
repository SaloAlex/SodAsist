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
    initialized
  } = useAuthStore();

  const handleAuthStateChanged = useCallback(async (firebaseUser: FirebaseUser | null) => {
    try {
      setUser(firebaseUser);
      
      if (!firebaseUser) {
        setUserData(null);
        setInitialized(true); // ✅ Marcar como inicializado
        return;
      }

      // Try to get user data from Firestore
      let userData = await FirebaseService.getDocument<User>('users', firebaseUser.uid);
      
      // If user doesn't exist in Firestore, create it
      if (!userData) {
        console.log('🔄 Creando nuevo usuario en Firestore...');
        console.log('👤 Usuario Firebase:', firebaseUser);
        
        try {
          // Verificar que el usuario tenga email
          if (!firebaseUser.email) {
            throw new Error('Usuario no tiene email');
          }

          // Verificar si es el primer usuario (colección users vacía)
          const isFirstUser = await FirebaseService.isFirstUser();
          console.log('👥 Es primer usuario:', isFirstUser);

          // Determinar el rol del usuario según el plan
          let userRole: 'owner' | 'admin' | 'manager' | 'sodero';
          if (isFirstUser) {
            // El primer usuario es siempre 'owner' del plan individual
            userRole = 'owner';
            console.log('👑 Asignando rol OWNER al primer usuario');
          } else {
            // Para usuarios adicionales, el rol se determina por el tenant
            userRole = 'sodero';
            console.log('👤 Asignando rol SODERO al usuario');
          }

          // Determinar el plan del usuario
          let userPlan: 'individual' | 'business' | 'enterprise';
          if (isFirstUser) {
            // El primer usuario puede elegir su plan durante el registro
            // Intentar obtener el plan del localStorage (se establece en PlanSelection)
            const selectedPlan = localStorage.getItem('selectedPlan') as 'individual' | 'business' | 'enterprise' | null;
            userPlan = selectedPlan || 'individual';
            console.log('📋 Plan seleccionado durante registro:', userPlan);
            
            // Limpiar el localStorage después de usarlo
            if (selectedPlan) {
              localStorage.removeItem('selectedPlan');
            }
          } else {
            // Para usuarios adicionales, el plan se determina por el tenant
            userPlan = 'individual'; // Por defecto, se puede cambiar después
            console.log('📋 Asignando plan por defecto al usuario');
          }

          console.log('📋 Datos del usuario a crear:', {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: userRole,
            plan: userPlan,
            isFirstUser: isFirstUser
          });

          const newUserData: Omit<User, 'id'> = {
            uid: firebaseUser.uid,
            nombre: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
            email: firebaseUser.email,
            rol: userRole,
            plan: userPlan,
            tenantId: firebaseUser.email, // Usar email como tenantId temporalmente
            createdAt: new Date(),
          };
          
          console.log('📝 Datos del nuevo usuario:', newUserData);
          
          // Crear documento de usuario
          await FirebaseService.createUserDocument(newUserData);
          console.log('✅ Documento de usuario creado');
          
          // Si es el primer usuario, crear también el documento del tenant
          if (isFirstUser) {
            try {
              // Calcular maxUsers según el plan seleccionado
              let maxUsers: number;
              switch (userPlan) {
                case 'individual':
                  maxUsers = 1;
                  break;
                case 'business':
                  maxUsers = 11;
                  break;
                case 'enterprise':
                  maxUsers = 999; // Número alto para representar "ilimitado"
                  break;
                default:
                  maxUsers = 1;
              }
              
              await FirebaseService.createTenantDocument({
                id: firebaseUser.email,
                nombre: firebaseUser.displayName || 'Mi Empresa',
                email: firebaseUser.email,
                plan: userPlan,
                maxUsers: maxUsers,
                currentUserCount: 1,
                adminUid: firebaseUser.uid,
                empleados: [],
                createdAt: new Date(),
                updatedAt: new Date()
              });
              console.log('✅ Documento de tenant creado');
            } catch (tenantError) {
              console.warn('⚠️ Error creando documento de tenant:', tenantError);
              // No es crítico, se puede crear después
            }
          }
          
          userData = { ...newUserData, id: firebaseUser.uid };
          toast.success('Usuario creado correctamente');
        } catch (err) {
          console.error('❌ Error creating user document:', err);
          console.error('❌ Error details:', {
            message: err instanceof Error ? err.message : 'Unknown error',
            stack: err instanceof Error ? err.stack : undefined,
            user: firebaseUser
          });
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
  }, [setUser, setUserData, setError, setInitialized]);

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