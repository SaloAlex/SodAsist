# 🏢 VaListo - Sistema Multi-Tenant para Desarrolladores

## 📋 Arquitectura del Sistema

VaListo utiliza un sistema de **Multi-Tenancy por Proyecto** donde cada cliente tiene su propio proyecto de Firebase completamente aislado.

## 🏗️ Estructura de Tenants

### **Configuración de Tenants**
```typescript
// src/config/tenantConfig.ts
export const TENANTS: Record<string, TenantConfig> = {
  'default': {
    id: 'default',
    name: 'VaListo',
    projectId: 'valisto-demo',
    domain: 'demo.valisto.app',
    firebaseConfig: { /* configuración Firebase */ }
  },
  'cristian': {
    id: 'cristian',
    name: 'Cristian Padin - Reparto de Agua',
    projectId: 'cristian-reparto-123456',
    domain: 'cristian.valisto.app',
    firebaseConfig: { /* configuración Firebase */ }
  },
  'agua-pura': {
    id: 'agua-pura',
    name: 'Agua Pura S.A.',
    projectId: 'agua-pura-sa-789012',
    domain: 'agua-pura.valisto.app',
    firebaseConfig: { /* configuración Firebase */ }
  }
};
```

## 🎯 Modelos de Cliente

### **1. Cliente Individual (Plan Individual)**
```
Tenant: cristian
├── Usuario: cristian.a.padin@gmail.com (admin)
├── Base de datos: Solo para Cristian
├── Funcionalidades: Completas para 1 usuario
└── Estado: Beta gratuita
```

### **2. Empresa con Empleados (Plan Empresa)**
```
Tenant: agua-pura
├── Usuario: gerente@agua-pura.com (admin)
├── Usuario: empleado1@agua-pura.com (sodero)
├── Usuario: empleado2@agua-pura.com (sodero)
├── Base de datos: Compartida entre empleados
├── Funcionalidades: Completas + gestión de empleados
└── Estado: Beta gratuita
```

### **3. Empresa Grande (Plan Enterprise)**
```
Tenant: sodas-express
├── Usuario: director@sodas-express.com (admin)
├── Usuarios: Ilimitados (soderos)
├── Base de datos: Compartida entre todos
├── Funcionalidades: Todas + API + integraciones
└── Estado: Beta gratuita
```

> **💡 Nota:** Actualmente en fase beta. Los precios se implementarán próximamente, comenzando desde USD 3 por cliente.

## 🔧 Configuración Técnica

### **Detección Automática de Tenant**
```typescript
// Función que detecta el tenant por dominio
export const getCurrentTenant = (): TenantConfig => {
  const hostname = window.location.hostname;
  
  // Buscar tenant por dominio
  const tenant = Object.values(TENANTS).find(t => t.domain === hostname);
  
  if (tenant) {
    return tenant;
  }
  
  // Fallback para desarrollo
  if (import.meta.env.DEV) {
    return {
      ...TENANTS.default,
      name: 'VaListo (Desarrollo)',
      projectId: 'sodapp-5cb8a'
    };
  }
  
  return TENANTS.default;
};
```

### **Inicialización de Firebase por Tenant**
```typescript
// src/config/firebase.ts
const firebaseConfig = getTenantFirebaseConfig();
const currentTenant = getCurrentTenant();

export const app = initializeApp(firebaseConfig, currentTenant.id);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
```

## 🚀 Creación de Nuevos Tenants

### **Script Automatizado**
```bash
# Crear nuevo tenant
node scripts/create-tenant.js "Nombre Cliente" "dominio.valisto.app"
```

### **Configuración Manual**
1. Crear proyecto en Firebase Console
2. Configurar Authentication, Firestore, Storage
3. Agregar tenant a `tenantConfig.ts`
4. Configurar dominio DNS
5. Desplegar aplicación

## 📊 Estructura de Datos por Tenant

### **Colecciones de Firestore**
```
/{tenant-project-id}/
├── users/           # Usuarios del tenant
├── clientes/        # Clientes del negocio
├── entregas/        # Registro de entregas
├── inventario/      # Control de stock
├── rutas/          # Rutas optimizadas
├── reportes/       # Reportes y analytics
└── configuracion/  # Configuración del tenant
```

### **Reglas de Seguridad**
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo usuarios autenticados del tenant
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🔐 Seguridad y Aislamiento

### **Aislamiento Total**
- ✅ Cada tenant tiene su propio proyecto Firebase
- ✅ No hay acceso cruzado entre clientes
- ✅ Base de datos completamente separada
- ✅ Autenticación independiente

### **Roles de Usuario**
- **Admin:** Acceso completo al sistema
- **Sodero:** Acceso limitado a funciones de entrega

### **Dominios Autorizados**
- Cada tenant tiene su dominio específico
- Autenticación restringida por dominio
- SSL/TLS obligatorio

## 💰 Modelo de Facturación (Futuro)

### **Facturación por Proyecto**
- Cada tenant pagará por su propio uso de Firebase
- Facturación independiente por cliente
- Escalado individual según necesidades

### **Precios Planificados**
- **Plan Individual:** Desde USD 3/mes
- **Plan Empresa:** Precio por determinar
- **Plan Enterprise:** Precio por determinar

### **Costos Técnicos por Tenant**
- **Firestore:** $5-20/mes (dependiendo del uso)
- **Storage:** $2-10/mes (fotos y documentos)
- **Functions:** $5-15/mes (procesamiento)
- **Hosting:** $25/mes (dominio personalizado)

> **💡 Nota:** Durante la beta, todos los costos técnicos son cubiertos por el desarrollador.

## 🚀 Despliegue

### **Despliegue Único**
```bash
npm run build
firebase deploy
```

### **Configuración de Dominios**
- Configurar DNS para cada dominio de cliente
- Usar Firebase Hosting con múltiples dominios
- O usar proxy reverso (nginx, Cloudflare)

### **Monitoreo**
- Firebase Console por proyecto
- Logs centralizados
- Métricas por cliente

## 📈 Escalabilidad

### **Onboarding Automatizado**
- Scripts de creación de tenants
- Templates de configuración
- Migración de datos asistida

### **Monitoreo Centralizado**
- Dashboard de administración
- Métricas por tenant
- Alertas automáticas

### **Backups Automáticos**
- Exportación diaria de Firestore
- Backup de Storage
- Configuración de recuperación

## 🔄 Migración de Datos

### **Para Clientes Existentes**
```bash
# Exportar datos del proyecto actual
firebase firestore:export --project=proyecto-actual

# Importar a nuevo proyecto
firebase firestore:import --project=nuevo-proyecto
```

### **Scripts de Migración**
- Migración automática de usuarios
- Importación de clientes
- Configuración de productos
- Transferencia de historial

## 🛠️ Herramientas de Desarrollo

### **Scripts Disponibles**
- `create-tenant.js` - Crear nuevos tenants
- `migrate-data.js` - Migrar datos entre proyectos
- `backup-tenant.js` - Backup de tenant específico
- `monitor-usage.js` - Monitorear uso por tenant

### **Entorno de Desarrollo**
- Emuladores de Firebase
- Datos de prueba por tenant
- Herramientas de debugging

## 📞 Soporte Técnico

### **Para Desarrolladores**
- Documentación técnica completa
- Ejemplos de código
- Guías de implementación

### **Para Clientes**
- Documentación de usuario
- Videos tutoriales
- Soporte por email/chat

---

**¿Necesitas ayuda con la implementación?**
Contacta al equipo de desarrollo para soporte técnico.
