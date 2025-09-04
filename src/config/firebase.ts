import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getTenantFirebaseConfig, getCurrentTenant } from './tenantConfig';

// Obtener configuración del tenant actual
const firebaseConfig = getTenantFirebaseConfig();
const currentTenant = getCurrentTenant();

// Validar configuración del tenant
const requiredConfig = {
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
};

// Verificar que todas las variables estén definidas
const missingVars = Object.entries(requiredConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('🚨 Firebase: Configuración faltante:', missingVars);
  throw new Error(`Configuración faltante para tenant ${currentTenant.name}: ${missingVars.join(', ')}`);
}

// Initialize Firebase con configuración del tenant
export const app = initializeApp(firebaseConfig, currentTenant.id);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Exportar información del tenant
export { currentTenant };

export default app;