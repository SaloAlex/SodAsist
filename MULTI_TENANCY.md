# 🏢 Sistema Multi-Tenancy para VaListo

## 📋 Descripción

El sistema multi-tenant permite que cada cliente tenga su propia instancia de VaListo con:
- **Base de datos separada** (Firestore)
- **Autenticación independiente** (Firebase Auth)
- **Almacenamiento aislado** (Firebase Storage)
- **Dominio personalizado** (ej: `agua-pura.valisto.app`)

## 🏗️ Arquitectura

### **Opción 1: Multi-Tenancy por Proyecto (Recomendado)**

Cada cliente tiene su propio proyecto de Firebase:

```
Cliente A (Agua Pura S.A.)
├── Proyecto: agua-pura-sa
├── Dominio: agua-pura.valisto.app
├── Base de datos: Firestore independiente
└── Usuarios: Solo del cliente A

Cliente B (Sodas Express)
├── Proyecto: sodas-express
├── Dominio: sodas-express.valisto.app
├── Base de datos: Firestore independiente
└── Usuarios: Solo del cliente B
```

### **Ventajas:**
- ✅ **Aislamiento total** de datos
- ✅ **Seguridad máxima** (cada cliente en su propio proyecto)
- ✅ **Escalabilidad** independiente
- ✅ **Facturación separada** por cliente
- ✅ **Cumplimiento** de regulaciones de datos

## 🚀 Cómo crear un nuevo cliente

### **1. Usar el script automatizado**

```bash
# Crear nuevo tenant
node scripts/create-tenant.js "Agua Pura S.A." "agua-pura.valisto.app"
```

### **2. Configuración manual**

1. **Crear proyecto en Firebase Console**
   - Ve a https://console.firebase.google.com/
   - Crea nuevo proyecto con ID único
   - Habilita Authentication, Firestore y Storage

2. **Configurar dominio**
   - Agrega el dominio en Firebase Auth
   - Configura DNS para apuntar a tu aplicación

3. **Actualizar configuración**
   - Agrega el tenant en `src/config/tenantConfig.ts`
   - Actualiza las credenciales de Firebase

## 📁 Estructura de archivos

```
src/
├── config/
│   ├── firebase.ts          # Configuración dinámica por tenant
│   └── tenantConfig.ts      # Configuración de todos los tenants
├── components/
│   └── common/
│       └── TenantInfo.tsx   # Muestra info del tenant actual
└── ...

scripts/
└── create-tenant.js         # Script para crear nuevos tenants

tenants/
└── [tenant-id]-setup.md     # Instrucciones por cliente
```

## 🔧 Configuración de tenants

### **Archivo: `src/config/tenantConfig.ts`**

```typescript
export const TENANTS: Record<string, TenantConfig> = {
  'default': {
    id: 'default',
    name: 'VaListo Demo',
    projectId: 'valisto-demo',
    domain: 'demo.valisto.app',
    firebaseConfig: { /* configuración Firebase */ }
  },
  'agua-pura': {
    id: 'agua-pura',
    name: 'Agua Pura S.A.',
    projectId: 'agua-pura-sa',
    domain: 'agua-pura.valisto.app',
    firebaseConfig: { /* configuración Firebase */ }
  }
};
```

## 🌐 Configuración de dominios

### **Opción A: Subdominios**
```
demo.valisto.app      → Tenant Demo
agua-pura.valisto.app → Cliente Agua Pura
sodas-express.valisto.app → Cliente Sodas Express
```

### **Opción B: Dominios personalizados**
```
agua-pura.com         → Cliente Agua Pura
sodas-express.com     → Cliente Sodas Express
```

## 🔒 Seguridad

### **Aislamiento de datos**
- Cada tenant tiene su propio proyecto Firebase
- No hay posibilidad de acceso cruzado entre clientes
- Reglas de Firestore específicas por proyecto

### **Autenticación**
- Usuarios solo pueden acceder a su propio tenant
- Dominios autorizados por proyecto
- Tokens de autenticación específicos por tenant

## 💰 Facturación

### **Por proyecto Firebase**
- Cada cliente paga por su propio uso
- Facturación independiente
- Escalado individual

### **Costos típicos por cliente**
- **Firestore**: ~$5-20/mes (dependiendo del uso)
- **Storage**: ~$2-10/mes (fotos y documentos)
- **Functions**: ~$5-15/mes (procesamiento)
- **Hosting**: ~$25/mes (dominio personalizado)

## 🚀 Despliegue

### **1. Despliegue único**
```bash
npm run build
firebase deploy
```

### **2. Configuración de dominios**
- Configura DNS para cada dominio de cliente
- Usa Firebase Hosting con múltiples dominios
- O usa un proxy reverso (nginx, Cloudflare)

### **3. Monitoreo**
- Firebase Console por proyecto
- Logs centralizados
- Métricas por cliente

## 📊 Monitoreo y mantenimiento

### **Herramientas recomendadas**
- **Firebase Console**: Por proyecto
- **Google Analytics**: Por tenant
- **Error tracking**: Sentry por proyecto
- **Uptime monitoring**: Pingdom, UptimeRobot

### **Backups**
- Exportación automática de Firestore
- Backup de Storage
- Configuración de recuperación

## 🔄 Migración de datos

### **Para clientes existentes**
1. Exportar datos del proyecto actual
2. Crear nuevo tenant
3. Importar datos al nuevo proyecto
4. Actualizar configuración
5. Migrar usuarios

### **Scripts de migración**
```bash
# Exportar datos
firebase firestore:export --project=proyecto-actual

# Importar a nuevo proyecto
firebase firestore:import --project=nuevo-proyecto
```

## 📞 Soporte

### **Para cada cliente**
- Documentación específica
- Videos de capacitación
- Soporte técnico dedicado
- Portal de ayuda personalizado

### **Escalabilidad**
- Onboarding automatizado
- Templates de configuración
- Scripts de migración
- Monitoreo centralizado

## 🎯 Próximos pasos

1. **Implementar sistema de facturación**
2. **Crear portal de administración**
3. **Automatizar onboarding**
4. **Implementar métricas por tenant**
5. **Crear sistema de backups automáticos**

---

**¿Necesitas ayuda con la implementación?** 
Contacta al equipo de desarrollo para soporte técnico.
