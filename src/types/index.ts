export interface Cliente {
  id?: string;
  nombre: string;
  direccion: string;
  telefono: string;
  frecuenciaVisita: 'diaria' | 'semanal' | 'bisemanal' | 'mensual';
  diaVisita?: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
  observaciones?: string;
  saldoPendiente: number;
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
  fecha: Date;
  sodas: number;
  bidones10: number;
  bidones20: number;
  updatedAt: Date;
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
  clientes: Cliente[];
  distanciaTotal: number;
  tiempoEstimado: number;
  orden: number[];
}