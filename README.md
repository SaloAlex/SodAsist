# 🚀 SodAsist - Sistema Integral de Distribución de Bebidas

**Sistema web avanzado para la gestión integral de empresas distribuidoras de agua y bebidas, construido con tecnologías modernas y arquitectura escalable.**

## 🎯 Descripción del Proyecto

SodAsist es una aplicación web completa que combina gestión de inventario dinámico, optimización de rutas inteligente, análisis de datos en tiempo real y arquitectura multi-tenant. Diseñado para digitalizar y optimizar completamente el negocio de distribución de bebidas.

## ✨ Características Principales

### 🏢 **Sistema Multi-Tenant**
- **Arquitectura escalable** para múltiples clientes simultáneos
- **Aislamiento completo** de datos por tenant
- **Configuración por dominio** para cada empresa
- **Planes flexibles** (Individual, Business, Enterprise)

### 📦 **Inventario Dinámico**
- **Productos configurables** con categorías personalizables
- **Control de stock** en tiempo real con alertas automáticas
- **Movimientos de inventario** con trazabilidad completa
- **Inventario vehicular** para control de productos en ruta
- **Validaciones automáticas** de stock mínimo/máximo

### 🗺️ **Optimización de Rutas Inteligente**
- **Algoritmo de optimización** con Google Maps API
- **Geocodificación masiva** con rate limiting
- **Cálculo de distancias y tiempos** con tráfico en tiempo real
- **Agrupación por zonas** para rutas grandes (>25 puntos)
- **Navegación integrada** con Google Maps

### 📊 **Dashboard Ejecutivo**
- **Métricas en tiempo real**: ventas, entregas, eficiencia
- **Gráficos interactivos** con exportación (PNG, PDF, CSV)
- **Análisis de pagos** por método y estado
- **Widgets configurables** con pestañas dinámicas
- **Comparativas temporales** (hoy vs ayer, semana, mes)

### 👥 **Gestión de Clientes Avanzada**
- **Geolocalización automática** con validación de direcciones
- **Frecuencias de visita** configurables
- **Historial completo** de entregas y pagos
- **Cálculo automático** de saldos pendientes
- **Segmentación por zonas** geográficas

### 📱 **Sistema de Entregas**
- **Formularios dinámicos** adaptables por producto
- **Firma digital** y fotografías de entrega
- **Múltiples métodos de pago** (efectivo, transferencia, tarjeta)
- **Actualización automática** de inventario y saldos
- **Notificaciones push** al cliente

## 🚀 Stack Tecnológico

### **Frontend**
- **React 18.3.1** con TypeScript 5.5.3
- **Vite 6.3.5** como build tool optimizado
- **TailwindCSS 3.4.1** para UI responsiva
- **Zustand 4.4.7** para estado global con persistencia
- **React Router DOM 6.20.1** para navegación
- **Lucide React 0.344.0** para iconografía (2000+ iconos)

### **Backend & Base de Datos**
- **Firebase 12.1.0** (Firestore, Auth, Functions, Storage, Hosting)
- **Cloud Functions** con Node.js y TypeScript
- **Firebase Auth** con roles multi-nivel
- **Firestore** con estructura multi-tenant
- **Firebase Storage** para archivos e imágenes

### **Servicios Externos**
- **Google Maps API** con optimización de rutas
- **Firebase Cloud Messaging** + Service Workers
- **jsPDF + html2canvas** para exportación de reportes
- **Recharts 2.15.4** para gráficos interactivos

### **Herramientas de Desarrollo**
- **ESLint** con configuración estricta
- **TypeScript** con tipado estricto
- **Vitest** para testing
- **Testing Library** para componentes React

## 🏗️ Arquitectura y Componentes

### **Hooks Personalizados**
```typescript
// Hook para React Query optimizado
export const useProductosQuery = () => {
  return useQuery({
    queryKey: ['productos', 'paginados', filtros, paginacion],
    queryFn: () => ProductosService.getProductosPaginados(filtros, paginacion),
    placeholderData: (previousData) => previousData, // React Query v5
    gcTime: 10 * 60 * 1000
  });
};
```

### **Servicios Especializados**
- **FirebaseService**: CRUD genérico con multi-tenancy
- **InventarioService**: Transacciones atómicas con validaciones
- **RouteOptimizer**: Algoritmos de optimización avanzados
- **ChartExportService**: Exportación de gráficos en múltiples formatos
- **PushNotificationService**: Notificaciones push con FCM

### **Componentes UI Reutilizables**
- **DataTable**: Tabla avanzada con paginación, búsqueda y ordenamiento
- **ChartCard**: Gráficos interactivos con exportación
- **GoogleMapsErrorBoundary**: Manejo de errores de Google Maps
- **NotificationSettings**: Configuración de notificaciones push
- **Pagination**: Paginación completa con controles avanzados

## 📊 Estructura de Datos

### **Modelo de Datos Principal**
```typescript
interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  precioCompra: number;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  unidadMedida: UnidadMedida;
  activo: boolean;
}

interface Entrega {
  id: string;
  clienteId: string;
  productos?: ProductoEntrega[]; // Sistema dinámico
  total: number;
  pagado: boolean;
  medioPago?: 'efectivo' | 'transferencia' | 'tarjeta';
  firmaURL?: string;
  fotoEntregaURL?: string;
}
```

### **Multi-Tenancy**
- **Estructura**: `tenants/{email}/{collection}/{document}`
- **Aislamiento**: Datos completamente separados por tenant
- **Escalabilidad**: Soporte para múltiples clientes simultáneos

## 🔒 Seguridad y Configuración

### **Variables de Entorno**
```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_proyecto
VITE_GOOGLE_MAPS_API_KEY=tu_google_maps_key
VITE_FIREBASE_VAPID_KEY=tu_vapid_key
```

### **Reglas de Seguridad Firestore**
- **Autenticación requerida** para todas las operaciones
- **Aislamiento por tenant** usando el email del usuario
- **Validación de datos** en el servidor
- **Control de acceso** basado en roles

## 🚀 Características Avanzadas

### **PWA (Progressive Web App)**
- **Service Worker** con caché inteligente
- **Instalable** en dispositivos móviles
- **Funcionalidad offline** básica
- **Notificaciones push** nativas

### **Optimizaciones de Rendimiento**
- **Code splitting** automático con Vite
- **Tree shaking** para reducir bundle size
- **Lazy loading** de componentes pesados
- **Memoización** de cálculos complejos
- **Virtual scrolling** para listas grandes

### **Internacionalización**
- **Configuración en español** para todas las librerías
- **Formatos locales** para fechas y números
- **Zona horaria** configurada para Argentina

## 🔄 Flujos de Trabajo

### **Proceso de Entrega**
1. **Selección de cliente** desde la ruta optimizada
2. **Registro de productos** entregados
3. **Captura de firma** digital del cliente
4. **Fotografía de entrega** (opcional)
5. **Procesamiento de pago** inmediato o diferido
6. **Actualización automática** de inventario y saldos
7. **Generación de comprobante** digital

### **Optimización de Rutas**
1. **Selección de clientes** para el día
2. **Geocodificación** de direcciones
3. **Cálculo de matriz** de distancias
4. **Aplicación de algoritmo** de optimización
5. **Generación de ruta** con estadísticas
6. **Navegación integrada** con Google Maps

## 📈 Métricas y KPIs

- **Entregas por día/semana/mes**
- **Ventas totales y por producto**
- **Eficiencia de ruta** (tiempo/distancia)
- **Tasa de cobranza** y morosidad
- **Rotación de inventario**
- **Satisfacción del cliente**

## 🎯 Casos de Uso Principales

1. **Distribuidor Individual**: Gestión personal de ruta diaria
2. **Empresa Pequeña**: Equipo de 2-10 repartidores
3. **Empresa Grande**: Múltiples rutas y supervisores
4. **Franquicia**: Gestión multi-tenant con reportes centralizados

## 💡 Valor Diferencial

1. **Multi-tenancy nativo**: Escalabilidad empresarial
2. **Inventario dinámico**: Adaptable a cualquier tipo de producto
3. **Optimización de rutas**: Ahorro real de tiempo y combustible
4. **PWA completa**: Experiencia nativa en web
5. **Arquitectura moderna**: Tecnologías de vanguardia
6. **Exportación avanzada**: Reportes profesionales en múltiples formatos

## 🔮 Roadmap Futuro

- [ ] **Integración con sistemas de facturación**
- [ ] **Análisis predictivo** de demanda
- [ ] **App móvil nativa** (React Native)
- [ ] **Integración con GPS** del vehículo
- [ ] **Sistema de empleados** y turnos avanzado
- [ ] **Integración con pasarelas** de pago

---

**SodAsist representa una solución integral, escalable y moderna para la digitalización completa de empresas distribuidoras, con un enfoque especial en la experiencia del usuario y la eficiencia operacional.**

*Desarrollado con tecnologías de vanguardia para optimizar el negocio de distribución de bebidas.*
