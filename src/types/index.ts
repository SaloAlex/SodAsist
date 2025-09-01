export interface DireccionDetalles {
  placeId: string;
  direccionCompleta: string;
  direccionNormalizada: string;
  calle?: string;
  numero?: string;
  colonia?: string;
  ciudad?: string;
  estado?: string;
  codigoPostal?: string;
  pais: string;
  coords: {
    lat: number;
    lng: number;
  };
  addressComponents?: {
    long_name: string;
    short_name: string;
    types: string[];
  }[];
}

export interface DireccionValidacion {
  isValid: boolean;
  error?: string;
  partialMatch?: boolean;
}

export interface AreaServicio {
  pais: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface Cliente {
  id?: string;
  nombre: string;
  telefono: string;
  direccion: string;
  direccionDetalles?: DireccionDetalles;
  coords?: {
    lat: number;
    lng: number;
  };
  frecuenciaVisita: 'semanal' | 'quincenal' | 'mensual';
  diaVisita: 'lunes' | 'martes' | 'miércoles' | 'jueves' | 'viernes' | 'sábado' | 'domingo';
  observaciones?: string;
  bidones10?: number;
  bidones20?: number;
  sodas?: number;
  envasesDevueltos?: number;
  total?: number;
  pagado?: boolean;
  saldoPendiente?: number;
  createdAt?: Date;
  updatedAt?: Date;
  ultimaEntregaFecha?: Date;
  consumoPromedioBidones?: number;
  consumoPromedioSodas?: number;
  zona?: string;
}

export interface Entrega {
  id: string;
  clienteId: string;
  fecha: Date;
  sodas: number;
  bidones10: number;
  bidones20: number;
  envasesDevueltos: number;
  total: number;
  pagado: boolean;
  medioPago?: 'efectivo' | 'transferencia' | 'tarjeta';
  firmaURL?: string;
  fotoEntregaURL?: string;
  observaciones?: string;
  createdAt: Date;
}

export interface Pago {
  id: string;
  clienteId: string;
  fecha: Date;
  monto: number;
  medioPago: 'efectivo' | 'transferencia' | 'tarjeta';
  nota?: string;
  createdAt: Date;
}

export interface InventarioVehiculo {
  id: string;
  fecha: Date;
  sodas: number;
  bidones10: number;
  bidones20: number;
  envasesDevueltos: number;
  updatedAt?: Date;
}

export interface User {
  id?: string;
  uid: string;
  nombre: string;
  email: string;
  rol: 'owner' | 'admin' | 'manager' | 'sodero'; // Agregamos 'owner' como rol principal
  plan: 'individual' | 'business' | 'enterprise';
  tenantId: string;
  createdAt: Date;
  updatedAt?: Date;
  isActive?: boolean; // Para empleados activos/inactivos
  invitedBy?: string; // UID del usuario que invitó
  invitedAt?: Date; // Fecha de invitación
  acceptedAt?: Date; // Fecha de aceptación de la invitación
}

export interface Tenant {
  id: string;
  nombre: string;
  email: string;
  plan: 'individual' | 'business' | 'enterprise';
  maxUsers: number; // 1, 11, o null (ilimitado)
  currentUserCount: number; // Contador actual de usuarios
  adminUid: string; // UID del owner
  empleados: {
    uid: string;
    rol: 'admin' | 'manager' | 'sodero';
    nombre: string;
    email: string;
    isActive: boolean;
    invitedAt: Date;
    acceptedAt?: Date;
  }[]; // Array de empleados con información detallada
  createdAt: Date;
  updatedAt: Date;
  upgradeHistory?: {
    fromPlan: string;
    toPlan: string;
    date: Date;
    reason: 'user_limit_reached' | 'manual_upgrade' | 'downgrade';
  }[];
  config?: {
    timezone?: string;
    currency?: string;
    language?: string;
  };
}

// Nueva interfaz para planes
export interface Plan {
  id: 'individual' | 'business' | 'enterprise';
  name: string;
  price: string;
  maxUsers: number | null; // null = ilimitado
  features: string[];
  description: string;
  isPopular?: boolean;
}

// Interfaz para el modal de upgrade
export interface UpgradeOption {
  planId: 'business' | 'enterprise';
  name: string;
  price: string;
  maxUsers: number | null;
  features: string[];
  currentPlan?: boolean;
}

export interface KPI {
  fecha: Date;
  litrosVendidos: number;
  cobranzasTotal: number;
  porcentajeMora: number;
  clientesAtendidos: number;
  entregasRealizadas: number;
}

export interface RutaOptimizada {
  id: string;
  fecha: Date;
  clientes: {
    clienteId: string;
    orden: number;
    distanciaAlSiguiente: number;
    tiempoEstimado: number;
  }[];
  distanciaTotal: number;
  tiempoEstimadoTotal: number;
  zonas: string[];
  ubicacionInicial?: LatLng;
}

export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

export interface Visita {
  id: string;
  clienteId: string;
  fecha: FirestoreTimestamp;
  completada: boolean;
  notas?: string;
  productosEntregados?: {
    producto: string;
    cantidad: number;
  }[];
  tiempoVisita?: number; // en minutos
  ubicacionCompletado?: {
    lat: number;
    lng: number;
  };
}

export interface ClienteConRuta extends Cliente {
  coords?: LatLng;
  orden?: number;
  distanciaAlSiguiente?: number;
  tiempoEstimado?: number;
  notas?: string;
  estado?: EstadoVisita;
  ultimaVisita?: Date;
  zona?: string;
}

export interface NotificacionCliente {
  id: string;
  clienteId: string;
  tipo: 'llegada' | 'retraso' | 'cancelacion';
  mensaje: string;
  horaEstimada?: Date;
  estado: 'pendiente' | 'enviada' | 'entregada' | 'fallida';
  fechaCreacion: Date;
  fechaActualizacion: Date;
}

// Enums para estados y tipos
export enum EstadoVisita {
  PENDIENTE = 'pendiente',
  COMPLETADA = 'completado',
  CANCELADA = 'cancelado'
}

export enum TipoNotificacion {
  LLEGADA = 'llegada',
  RETRASO = 'retraso',
  CANCELACION = 'cancelacion'
}

export enum PrioridadCliente {
  BAJA = 'baja',
  MEDIA = 'media',
  ALTA = 'alta'
}

// Interfaces para configuración
export interface ConfiguracionRuta {
  horaInicio: string; // formato HH:mm
  horaFin: string; // formato HH:mm
  tiempoPromedioVisita: number; // en minutos
  descansos: {
    hora: string;
    duracion: number; // en minutos
  }[];
  zonaPredeterminada?: string;
  optimizacionPredeterminada: 'distancia' | 'tiempo' | 'mixta';
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteStats {
  distanciaTotal: number;
  tiempoTotal: number;
  distanciasIndividuales: number[];
  tiemposIndividuales: number[];
}

// ============================================
// NUEVO SISTEMA DE INVENTARIO DINÁMICO
// ============================================

export interface Producto {
  id: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  codigo?: string;
  codigoBarras?: string;
  unidadMedida: UnidadMedida;
  precioCompra: number;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  stockMaximo?: number;
  activo: boolean;
  proveedor?: string;
  fechaVencimiento?: Date;
  ubicacion?: string;
  imagen?: string;
  peso?: number; // en gramos
  volumen?: number; // en ml
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface CategoriaProducto {
  id: string;
  nombre: string;
  descripcion?: string;
  color: string;
  icono: string;
  activa: boolean;
  orden: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MovimientoInventario {
  id: string;
  productoId: string;
  tipo: TipoMovimiento;
  cantidad: number;
  cantidadAnterior: number;
  cantidadNueva: number;
  motivo: string;
  referencia?: string; // ID de entrega, compra, ajuste, etc.
  observaciones?: string;
  fecha: Date;
  usuario: string;
  ubicacion?: string;
  createdAt: Date;
}

export interface AjusteInventario {
  id: string;
  fecha: Date;
  motivo: string;
  observaciones?: string;
  usuario: string;
  productos: {
    productoId: string;
    cantidadAnterior: number;
    cantidadNueva: number;
    diferencia: number;
    motivo?: string;
  }[];
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  aprobadoPor?: string;
  fechaAprobacion?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Proveedor {
  id: string;
  nombre: string;
  contacto: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  activo: boolean;
  productos: string[]; // IDs de productos
  createdAt: Date;
  updatedAt: Date;
}

export interface HistorialPrecio {
  id: string;
  productoId: string;
  precioAnterior: number;
  precioNuevo: number;
  tipo: 'compra' | 'venta';
  motivo: string;
  fecha: Date;
  usuario: string;
  createdAt: Date;
}

// Nuevo inventario vehicular dinámico
export interface InventarioVehiculoDinamico {
  id: string;
  fecha: Date;
  productos: {
    productoId: string;
    cantidad: number;
  }[];
  ubicacion?: string;
  conductor: string;
  observaciones?: string;
  updatedAt: Date;
  createdAt: Date;
}

// Interfaces para reportes
export interface ReporteInventario {
  fecha: Date;
  valorTotalInventario: number;
  productosConStockBajo: number;
  productosAgotados: number;
  movimientosDelDia: number;
  ventasDelDia: number;
  comprasDelDia: number;
  productos: {
    id: string;
    nombre: string;
    categoria: string;
    stock: number;
    stockMinimo: number;
    valor: number;
    rotacion: number;
    diasSinMovimiento: number;
  }[];
}

export interface MetricasInventario {
  valorTotal: number;
  cantidadProductos: number;
  productosActivos: number;
  productosConStockBajo: number;
  productosAgotados: number;
  categorias: number;
  movimientosHoy: number;
  ventasHoy: number;
}

// Enums
export enum TipoMovimiento {
  ENTRADA = 'entrada',
  SALIDA = 'salida',
  AJUSTE = 'ajuste',
  VENTA = 'venta',
  DEVOLUCION = 'devolucion',
  MERMA = 'merma',
  TRANSFERENCIA = 'transferencia',
  INICIAL = 'inicial'
}

export enum UnidadMedida {
  UNIDAD = 'unidad',
  LITRO = 'litro',
  KILOGRAMO = 'kilogramo',
  GRAMO = 'gramo',
  METRO = 'metro',
  CENTIMETRO = 'centimetro',
  CAJA = 'caja',
  PAQUETE = 'paquete',
  DOCENA = 'docena'
}

export enum EstadoProducto {
  ACTIVO = 'activo',
  INACTIVO = 'inactivo',
  DESCONTINUADO = 'descontinuado'
}

// Configuración del sistema de inventario
export interface ConfiguracionInventario {
  alertasStockBajo: boolean;
  alertasStockAgotado: boolean;
  alertasVencimiento: boolean;
  diasAlertaVencimiento: number;
  permitirVentaSinStock: boolean;
  actualizarPreciosAutomatico: boolean;
  margenGananciaDefault: number;
  moneda: string;
  codigoBarrasAutomatico: boolean;
  ubicacionesMultiples: boolean;
  manejarLotes: boolean;
  manejarVencimientos: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Filtros para búsquedas y reportes
export interface FiltrosProductos {
  categoria?: string;
  proveedor?: string;
  activo?: boolean;
  conStock?: boolean;
  stockBajo?: boolean;
  busqueda?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
}

export interface FiltrosMovimientos {
  productoId?: string;
  tipo?: TipoMovimiento;
  usuario?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
  referencia?: string;
}

// Interfaz para la entrega actualizada con productos dinámicos
export interface EntregaDinamica {
  id: string;
  clienteId: string;
  fecha: Date;
  productos: {
    productoId: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }[];
  total: number;
  pagado: boolean;
  medioPago?: 'efectivo' | 'transferencia' | 'tarjeta';
  firmaURL?: string;
  fotoEntregaURL?: string;
  observaciones?: string;
  createdAt: Date;
  updatedAt: Date;
}