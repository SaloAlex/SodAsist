# VaListo - Gestión de Reparto de Agua

Un sistema completo de gestión para empresas de reparto de agua y sodas, construido con React, Firebase y TailwindCSS.

## ✨ Características

- **Gestión de Clientes**: CRUD completo con geolocalización y seguimiento de deudas
- **Optimización de Rutas**: Algoritmo de optimización con integración a Mapbox
- **Registro de Entregas**: Formularios rápidos con firma digital y fotografías
- **Inventario en Tiempo Real**: Control de stock del vehículo
- **Reportes y KPIs**: Dashboard con métricas de negocio
- **PWA**: Funcionalidad offline y instalable
- **Autenticación**: Login con email/password y Google
- **Responsive**: Diseño optimizado para móviles

## 🚀 Tecnologías

- **Frontend**: React 18, TypeScript, Vite
- **UI**: TailwindCSS, Lucide Icons, Recharts
- **Estado**: Zustand con persistencia
- **Backend**: Firebase (Firestore, Auth, Functions, Storage, Hosting)
- **Mapas**: Mapbox para optimización de rutas
- **PWA**: Service Worker, Web App Manifest

## 📦 Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd sistema-sodero
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Firebase

1. Crear un nuevo proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilitar Authentication (Email/Password y Google)
3. Crear base de datos Firestore
4. Habilitar Storage
5. Copiar la configuración de Firebase

### 4. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con tus credenciales de Firebase:

```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id

# Opcional: Token de Mapbox para optimización de rutas
VITE_MAPBOX_ACCESS_TOKEN=tu_mapbox_token
```

### 5. Configurar Firebase Functions

```bash
cd functions
npm install
cd ..
```

### 6. Inicializar Firebase

```bash
npm install -g firebase-tools
firebase login
firebase init
```

## 🛠️ Desarrollo

### Ejecutar en desarrollo

```bash
# Frontend
npm run dev

# Emuladores de Firebase (en otra terminal)
firebase emulators:start
```

### Construir para producción

```bash
npm run build
```

### Ejecutar tests

```bash
npm test
```

## 🚀 Despliegue

### Desplegar a Firebase Hosting

```bash
# Construir y desplegar
npm run build
firebase deploy

# Solo hosting
firebase deploy --only hosting

# Solo functions
firebase deploy --only functions
```

## 📱 Uso

### Primer Uso

1. Acceder a la aplicación
2. Registrarse con email/password o Google
3. Completar el perfil de usuario
4. Comenzar a agregar clientes
5. Registrar entregas

### Funcionalidades Principales

- **Dashboard**: Vista general con KPIs y acciones rápidas
- **Clientes**: Gestión completa de la base de clientes
- **Ruta de Hoy**: Optimización automática de rutas diarias
- **Entregas**: Registro rápido con firma y fotos
- **Inventario**: Control de stock en tiempo real
- **Reportes**: Análisis de ventas y tendencias

## 📊 Estructura de Datos

### Clientes
```typescript
{
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  lat?: number;
  lng?: number;
  frecuenciaVisita: 'diaria' | 'semanal' | 'bisemanal' | 'mensual';
  saldoPendiente: number;
  observaciones?: string;
}
```

### Entregas
```typescript
{
  id: string;
  clienteId: string;
  fecha: Date;
  sodas: number;
  bidones10: number;
  bidones20: number;
  total: number;
  pagado: boolean;
  medioPago?: string;
  firmaURL?: string;
  fotoEntregaURL?: string;
}
```

## 🔧 Configuración Avanzada

### Reglas de Firestore
Las reglas de seguridad están configuradas para:
- Usuarios autenticados pueden leer/escribir sus datos
- Acceso controlado por roles (admin/sodero)
- Validación de datos en el servidor

### Cloud Functions
- **onEntregaCreate**: Actualiza saldos e inventario automáticamente
- **genFacturaPdf**: Genera facturas en PDF
- **getKpisDaily**: Calcula KPIs diarios
- **generateDailyKpis**: Tarea programada para generar KPIs

### PWA
- Funcionalidad offline básica
- Instalable en dispositivos móviles
- Caché de recursos críticos

## 🤝 Contribuir

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 🆘 Soporte

Para reportar bugs o solicitar features, por favor abrir un [issue](https://github.com/tu-usuario/sistema-sodero/issues).

## 📈 Roadmap

- [ ] Notificaciones push
- [ ] Integración con sistemas de facturación
- [ ] Análisis predictivo de demanda
- [ ] Integración con GPS del vehículo
- [ ] App móvil nativa
- [ ] Integración con sistemas de pago
- [ ] Módulo de empleados y turnos
- [ ] Exportación de datos

---

Desarrollado con ❤️ para optimizar el negocio de reparto de agua.
