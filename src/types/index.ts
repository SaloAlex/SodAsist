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
  rol: 'admin' | 'sodero';
  createdAt: Date;
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
    distanciaAlSiguiente?: number; // en metros
    tiempoEstimado?: number; // en minutos
  }[];
  distanciaTotal: number; // en metros
  tiempoEstimadoTotal: number; // en minutos
  zonas: string[];
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
  estado?: 'pendiente' | 'completado' | 'cancelado';
  ultimaVisita?: Date;
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
  EN_CAMINO = 'en_camino',
  COMPLETADA = 'completada',
  CANCELADA = 'cancelada',
  REPROGRAMADA = 'reprogramada'
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