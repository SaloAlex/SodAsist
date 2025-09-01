// Configuración de Multi-Tenancy
export interface TenantConfig {
  id: string;
  name: string;
  projectId: string;
  domain: string;
  firebaseConfig: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
  };
}

// Configuración de tenants (cada cliente tendría su propio proyecto)
export const TENANTS: Record<string, TenantConfig> = {
  'default': {
    id: 'default',
    name: 'VaListo',
    projectId: 'valisto-demo',
    domain: 'demo.valisto.app',
    firebaseConfig: {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    }
  },
  // Cliente individual - Cristian
  'cristian': {
    id: 'cristian',
    name: 'Cristian Padin - Reparto de Agua',
    projectId: 'cristian-reparto-123456',
    domain: 'cristian.valisto.app',
    firebaseConfig: {
      apiKey: 'AIzaSyCristianApiKey',
      authDomain: 'cristian-reparto-123456.firebaseapp.com',
      projectId: 'cristian-reparto-123456',
      storageBucket: 'cristian-reparto-123456.appspot.com',
      messagingSenderId: '111222333',
      appId: '1:111222333:web:cristian123456',
    }
  },
  // Empresa con empleados - Agua Pura S.A.
  'agua-pura': {
    id: 'agua-pura',
    name: 'Agua Pura S.A.',
    projectId: 'agua-pura-sa-789012',
    domain: 'agua-pura.valisto.app',
    firebaseConfig: {
      apiKey: 'AIzaSyAguaPuraApiKey',
      authDomain: 'agua-pura-sa-789012.firebaseapp.com',
      projectId: 'agua-pura-sa-789012',
      storageBucket: 'agua-pura-sa-789012.appspot.com',
      messagingSenderId: '444555666',
      appId: '1:444555666:web:aguapura789012',
    }
  },
  // Empresa grande - Sodas Express
  'sodas-express': {
    id: 'sodas-express',
    name: 'Sodas Express',
    projectId: 'sodas-express-345678',
    domain: 'sodas-express.valisto.app',
    firebaseConfig: {
      apiKey: 'AIzaSySodasExpressApiKey',
      authDomain: 'sodas-express-345678.firebaseapp.com',
      projectId: 'sodas-express-345678',
      storageBucket: 'sodas-express-345678.appspot.com',
      messagingSenderId: '777888999',
      appId: '1:777888999:web:sodasexpress345678',
    }
  }
};

// Función para detectar el tenant actual
export const getCurrentTenant = (): TenantConfig => {
  // En desarrollo, usar el tenant por defecto
  if (import.meta.env.DEV) {
    return {
      ...TENANTS.default,
      name: 'VaListo (Desarrollo)',
      projectId: 'sodapp-5cb8a'
    };
  }

  // En producción, usar el tenant por dominio
  const hostname = window.location.hostname;
  const tenant = Object.values(TENANTS).find(t => t.domain === hostname);

  if (tenant) {
    return tenant;
  }

  // Si no encuentra por dominio, usar el default
  return {
    ...TENANTS.default,
    name: 'VaListo',
    projectId: hostname === 'probando.almarketing.site' ? 'sodapp-5cb8a' : 'valisto-demo'
  };
};

// Función para obtener la ruta de colección con tenant
export const getTenantCollectionPath = (collectionName: string): string => {
  const currentTenant = getCurrentTenant();
  return `tenants/${currentTenant.id}/${collectionName}`;
};

// Función para obtener el ID del tenant actual
export const getCurrentTenantId = (): string => {
  const currentTenant = getCurrentTenant();
  return currentTenant.id;
};

// Función para obtener configuración de Firebase del tenant actual
export const getTenantFirebaseConfig = () => {
  const tenant = getCurrentTenant();
  return tenant.firebaseConfig;
};

// Función para cambiar de tenant (útil para desarrollo)
export const switchTenant = (tenantId: string) => {
  const tenant = TENANTS[tenantId];
  if (!tenant) {
    throw new Error(`Tenant ${tenantId} no encontrado`);
  }
  
  // En desarrollo, cambiar la URL
  if (import.meta.env.DEV) {
    window.location.href = `http://${tenant.domain}:5173`;
  }
  
  return tenant;
};
