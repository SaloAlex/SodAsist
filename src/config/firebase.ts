import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, query, collection, limit, getDocs } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Validar que todas las variables de entorno estén configuradas
const requiredEnvVars = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
  VITE_FIREBASE_MEASUREMENT_ID: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Verificar que todas las variables estén definidas
const missingVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('🚨 Variables de entorno de Firebase faltantes:', missingVars);
  console.error('📝 Asegúrate de crear un archivo .env con todas las variables requeridas');
  throw new Error(`Variables de entorno faltantes: ${missingVars.join(', ')}`);
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth();
export const db = getFirestore();
export const functions = getFunctions();

// Configurar Firestore para mejor manejo de errores
import { connectFirestoreEmulator, enableNetwork, disableNetwork } from 'firebase/firestore';

// Configuración adicional para desarrollo
if (import.meta.env.DEV) {
  console.log('🔧 Modo desarrollo detectado');
  console.log('📊 Configuración de Firestore:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain
  });
}

// Función para verificar conectividad de Firestore
export const checkFirestoreConnection = async () => {
  try {
    // Intentar una operación simple para verificar la conexión
    const testQuery = query(collection(db, 'users'), limit(1));
    await getDocs(testQuery);
    console.log('✅ Conexión a Firestore exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error de conexión a Firestore:', error);
    return false;
  }
};

export default app;