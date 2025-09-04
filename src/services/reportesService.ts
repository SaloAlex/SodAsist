import { FirebaseService } from './firebaseService';
import { Cliente, Entrega, KPI } from '../types';
import { 
  subMonths,
  format,
  eachDayOfInterval,
  eachMonthOfInterval,
  differenceInDays
} from 'date-fns';
import { es } from 'date-fns/locale';

export interface VentasReporte {
  ventasMensuales: VentasMensual[];
  comparacionAnterior: ComparacionPeriodo;
  topProductos: ProductoVenta[];
  ventasPorDia: VentaDiaria[];
  resumenGeneral: ResumenVentas;
  metodosPago: MetodoPago[];
}

export interface CobranzasReporte {
  estadoCuentas: EstadoCuenta;
  clientesDeudores: ClienteDeudor[];
  cobranzasPorMes: CobranzaMensual[];
  tendenciaMora: TendenciaMora[];
  proyeccionCobranzas: ProyeccionCobranza[];
}

export interface TendenciasReporte {
  crecimientoVentas: CrecimientoVenta[];
  estacionalidad: Estacionalidad[];
  predicciones: Prediccion[];
  kpisEvolucion: KPIEvolucion[];
  analisisComparativo: AnalisisComparativo;
}

export interface ClientesReporte {
  segmentacion: SegmentacionCliente[];
  frecuenciaCompras: FrecuenciaCompra[];
  clientesTop: ClienteTop[];
  analisisGeografico: AnalisisGeografico[];
  retencionClientes: RetencionCliente[];
}

export interface VentasMensual {
  mes: string;
  año: number;
  ventas: number;
  cantidadEntregas: number;
  ticketPromedio: number;
  litrosVendidos: number;
}

export interface ComparacionPeriodo {
  ventasActual: number;
  ventasAnterior: number;
  variacion: number;
  variacionPorcentual: number;
}

export interface ProductoVenta {
  producto: string;
  cantidad: number;
  ingresos: number;
  porcentaje: number;
}

export interface VentaDiaria {
  fecha: string;
  ventas: number;
  entregas: number;
  ticketPromedio: number;
}

export interface MetodoPago {
  metodo: string;
  cantidad: number;
  monto: number;
  porcentaje: number;
}

export interface ResumenVentas {
  totalVentas: number;
  totalEntregas: number;
  ticketPromedio: number;
  crecimientoMensual: number;
  // Estadísticas de pago
  entregasPagadas: number;
  entregasPendientes: number;
  ventasPagadas: number;
  ventasPendientes: number;
  pagosEfectivo: number;
  pagosTransferencia: number;
  pagosTarjeta: number;
}

export interface EstadoCuenta {
  totalPendiente: number;
  clientesConDeuda: number;
  porcentajeMora: number;
  promedioDeuda: number;
}

export interface ClienteDeudor {
  id: string;
  nombre: string;
  deuda: number;
  diasVencimiento: number;
  ultimaCompra: Date;
  zona?: string;
}

export interface CobranzaMensual {
  mes: string;
  cobrado: number;
  pendiente: number;
  porcentajeCobro: number;
}

export interface TendenciaMora {
  fecha: string;
  porcentajeMora: number;
  clientesConDeuda: number;
}

export interface ProyeccionCobranza {
  mes: string;
  proyeccion: number;
  confianza: number;
}

export interface CrecimientoVenta {
  periodo: string;
  ventas: number;
  crecimiento: number;
}

export interface Estacionalidad {
  mes: string;
  indice: number;
  ventasPromedio: number;
}

export interface Prediccion {
  fecha: string;
  ventasPredichas: number;
  confianza: number;
}

export interface KPIEvolucion {
  fecha: string;
  litrosVendidos: number;
  cobranzasTotal: number;
  clientesAtendidos: number;
  eficiencia: number;
}

export interface AnalisisComparativo {
  periodoActual: string;
  periodoAnterior: string;
  metricas: {
    ventas: ComparacionPeriodo;
    clientes: ComparacionPeriodo;
    eficiencia: ComparacionPeriodo;
  };
}

export interface SegmentacionCliente {
  segmento: string;
  cantidad: number;
  porcentaje: number;
  ingresoPromedio: number;
}

export interface FrecuenciaCompra {
  frecuencia: string;
  clientes: number;
  ingresoPromedio: number;
  retencion: number;
}

export interface ClienteTop {
  id: string;
  nombre: string;
  totalCompras: number;
  frecuenciaVisitas: number;
  ultimaCompra: Date;
  zona?: string;
}

export interface AnalisisGeografico {
  zona: string;
  clientes: number;
  ventas: number;
  densidad: number;
}

export interface RetencionCliente {
  periodo: string;
  clientesNuevos: number;
  clientesRetenidos: number;
  tasaRetencion: number;
}

export interface FiltrosReporte {
  fechaInicio: Date;
  fechaFin: Date;
  zona?: string;
  clienteId?: string;
  tipoReporte: 'ventas' | 'cobranzas' | 'tendencias' | 'clientes';
}

export class ReportesService {
  
  /**
   * Genera reporte completo de ventas
   */
  static async generarReporteVentas(filtros: FiltrosReporte): Promise<VentasReporte> {
    try {
      const { fechaInicio, fechaFin } = filtros;
      
      // Obtener entregas del período
      const entregas = await FirebaseService.getEntregasByDateRange(fechaInicio, fechaFin);
      
      // Obtener período anterior para comparación
      const diasPeriodo = differenceInDays(fechaFin, fechaInicio);
      const fechaInicioAnterior = new Date(fechaInicio);
      fechaInicioAnterior.setDate(fechaInicioAnterior.getDate() - diasPeriodo);
      const fechaFinAnterior = new Date(fechaFin);
      fechaFinAnterior.setDate(fechaFinAnterior.getDate() - diasPeriodo);
      
      const entregasAnterior = await FirebaseService.getEntregasByDateRange(fechaInicioAnterior, fechaFinAnterior);

      // Generar análisis
      const ventasMensuales = this.calcularVentasMensuales(entregas);
      const comparacionAnterior = this.compararPeriodos(entregas, entregasAnterior);
      const topProductos = this.analizarProductos(entregas);
      const ventasPorDia = this.calcularVentasDiarias(entregas, fechaInicio, fechaFin);
      const resumenGeneral = this.generarResumenVentas(entregas, entregasAnterior);
      const metodosPago = this.calcularMetodosPago(entregas);

      return {
        ventasMensuales,
        comparacionAnterior,
        topProductos,
        ventasPorDia,
        resumenGeneral,
        metodosPago
      };
    } catch (error) {
      console.error('Error generando reporte de ventas:', error);
      throw error;
    }
  }

  /**
   * Genera reporte de cobranzas
   */
  static async generarReporteCobranzas(filtros: FiltrosReporte): Promise<CobranzasReporte> {
    try {
      const clientes = await FirebaseService.getClientes();
      const entregas = await FirebaseService.getEntregasByDateRange(filtros.fechaInicio, filtros.fechaFin);
      
      const estadoCuentas = this.analizarEstadoCuentas(clientes);
      const clientesDeudores = this.identificarClientesDeudores(clientes);
      const cobranzasPorMes = this.calcularCobranzasMensuales(entregas);
      const tendenciaMora = await this.analizarTendenciaMora();
      const proyeccionCobranzas = this.proyectarCobranzas(entregas);

      return {
        estadoCuentas,
        clientesDeudores,
        cobranzasPorMes,
        tendenciaMora,
        proyeccionCobranzas
      };
    } catch (error) {
      console.error('Error generando reporte de cobranzas:', error);
      throw error;
    }
  }

  /**
   * Genera reporte de clientes con saldos pendientes
   */
  static async generarReporteClientesConSaldo(): Promise<{
    clientesDeudores: ClienteDeudor[];
    totalDeuda: number;
    promedioDeuda: number;
    clientesAlDia: number;
    cantidadClientesConDeuda: number;
  }> {
    try {
      const clientes = await FirebaseService.getClientes();
      const clientesConDeuda = clientes.filter(c => (c.saldoPendiente || 0) > 0);
      const clientesAlDia = clientes.filter(c => (c.saldoPendiente || 0) === 0);
      
      const totalDeuda = clientesConDeuda.reduce((sum, c) => sum + (c.saldoPendiente || 0), 0);
      const promedioDeuda = clientesConDeuda.length > 0 ? totalDeuda / clientesConDeuda.length : 0;

      const clientesDeudoresDetalle: ClienteDeudor[] = clientesConDeuda.map(cliente => ({
        id: cliente.id || '',
        nombre: cliente.nombre,
        deuda: cliente.saldoPendiente || 0,
        diasVencimiento: this.calcularDiasVencimiento(cliente.ultimaEntregaFecha),
        ultimaCompra: cliente.ultimaEntregaFecha || new Date(),
        zona: cliente.zona
      }));

      return {
        clientesDeudores: clientesDeudoresDetalle,
        totalDeuda,
        promedioDeuda,
        clientesAlDia: clientesAlDia.length,
        cantidadClientesConDeuda: clientesConDeuda.length
      };
    } catch (error) {
      console.error('Error generando reporte de clientes con saldo:', error);
      throw error;
    }
  }

  /**
   * Genera reporte de tendencias
   */
  static async generarReporteTendencias(_filtros: FiltrosReporte): Promise<TendenciasReporte> {
    try {
      void _filtros; // evitar warning de variable no usada
      const entregas = await this.obtenerHistoricoEntregas(12); // 12 meses
      const kpis = await this.obtenerKPIsHistoricos(12);
      
      const crecimientoVentas = this.analizarCrecimiento(entregas);
      const estacionalidad = this.analizarEstacionalidad(entregas);
      const predicciones = this.generarPredicciones(entregas);
      const kpisEvolucion = this.analizarEvolucionKPIs(kpis);
      const analisisComparativo = this.compararPeriodosExtendido(entregas);

      return {
        crecimientoVentas,
        estacionalidad,
        predicciones,
        kpisEvolucion,
        analisisComparativo
      };
    } catch (error) {
      console.error('Error generando reporte de tendencias:', error);
      throw error;
    }
  }

  /**
   * Genera reporte de clientes
   */
  static async generarReporteClientes(filtros: FiltrosReporte): Promise<ClientesReporte> {
    try {
      const clientes = await FirebaseService.getCollection<Cliente>('clientes');
      const entregas = await FirebaseService.getEntregasByDateRange(filtros.fechaInicio, filtros.fechaFin);
      
      const segmentacion = this.segmentarClientes(clientes, entregas);
      const frecuenciaCompras = this.analizarFrecuenciaCompras(clientes);
      const clientesTop = this.identificarClientesTop(clientes, entregas);
      const analisisGeografico = this.analizarDistribucionGeografica(clientes, entregas);
      const retencionClientes = await this.analizarRetencionClientes();

      return {
        segmentacion,
        frecuenciaCompras,
        clientesTop,
        analisisGeografico,
        retencionClientes
      };
    } catch (error) {
      console.error('Error generando reporte de clientes:', error);
      throw error;
    }
  }

  // Métodos privados para cálculos específicos

  private static calcularVentasMensuales(entregas: Entrega[]): VentasMensual[] {
    const ventasPorMes = new Map<string, VentasMensual>();
    
    entregas.forEach(entrega => {
      const fecha = new Date(entrega.fecha);
      const clave = `${fecha.getFullYear()}-${fecha.getMonth()}`;
      const mesNombre = format(fecha, 'MMMM yyyy', { locale: es });
      
      if (!ventasPorMes.has(clave)) {
        ventasPorMes.set(clave, {
          mes: mesNombre,
          año: fecha.getFullYear(),
          ventas: 0,
          cantidadEntregas: 0,
          ticketPromedio: 0,
          litrosVendidos: 0
        });
      }
      
      const ventaMes = ventasPorMes.get(clave)!;
      ventaMes.ventas += entrega.total;
      ventaMes.cantidadEntregas += 1;
      ventaMes.litrosVendidos += (entrega.sodas || 0) + (entrega.bidones10 || 0) * 10 + (entrega.bidones20 || 0) * 20;
    });
    
    // Calcular ticket promedio
    ventasPorMes.forEach(venta => {
      venta.ticketPromedio = venta.cantidadEntregas > 0 ? venta.ventas / venta.cantidadEntregas : 0;
    });
    
    return Array.from(ventasPorMes.values()).sort((a, b) => 
      new Date(`${a.mes}`).getTime() - new Date(`${b.mes}`).getTime()
    );
  }

  private static compararPeriodos(entregas: Entrega[], entregasAnterior: Entrega[]): ComparacionPeriodo {
    const ventasActual = entregas.reduce((sum, e) => sum + e.total, 0);
    const ventasAnterior = entregasAnterior.reduce((sum, e) => sum + e.total, 0);
    const variacion = ventasActual - ventasAnterior;
    const variacionPorcentual = ventasAnterior > 0 ? (variacion / ventasAnterior) * 100 : 0;
    
    return {
      ventasActual,
      ventasAnterior,
      variacion,
      variacionPorcentual
    };
  }

  private static analizarProductos(entregas: Entrega[]): ProductoVenta[] {
    const productos = {
      sodas: { cantidad: 0, ingresos: 0 },
      bidones10: { cantidad: 0, ingresos: 0 },
      bidones20: { cantidad: 0, ingresos: 0 }
    };
    
    const PRECIOS = { soda: 50, bidon10: 200, bidon20: 350 }; // Precios base
    
    entregas.forEach(entrega => {
      productos.sodas.cantidad += entrega.sodas || 0;
      productos.bidones10.cantidad += entrega.bidones10 || 0;
      productos.bidones20.cantidad += entrega.bidones20 || 0;
      
      productos.sodas.ingresos += (entrega.sodas || 0) * PRECIOS.soda;
      productos.bidones10.ingresos += (entrega.bidones10 || 0) * PRECIOS.bidon10;
      productos.bidones20.ingresos += (entrega.bidones20 || 0) * PRECIOS.bidon20;
    });
    
    const totalIngresos = Object.values(productos).reduce((sum, p) => sum + p.ingresos, 0);
    
    return [
      {
        producto: 'Sodas',
        cantidad: productos.sodas.cantidad,
        ingresos: productos.sodas.ingresos,
        porcentaje: totalIngresos > 0 ? (productos.sodas.ingresos / totalIngresos) * 100 : 0
      },
      {
        producto: 'Bidones 10L',
        cantidad: productos.bidones10.cantidad,
        ingresos: productos.bidones10.ingresos,
        porcentaje: totalIngresos > 0 ? (productos.bidones10.ingresos / totalIngresos) * 100 : 0
      },
      {
        producto: 'Bidones 20L',
        cantidad: productos.bidones20.cantidad,
        ingresos: productos.bidones20.ingresos,
        porcentaje: totalIngresos > 0 ? (productos.bidones20.ingresos / totalIngresos) * 100 : 0
      }
    ].sort((a, b) => b.ingresos - a.ingresos);
  }

  private static calcularVentasDiarias(entregas: Entrega[], fechaInicio: Date, fechaFin: Date): VentaDiaria[] {
    const dias = eachDayOfInterval({ start: fechaInicio, end: fechaFin });
    const ventasPorDia = new Map<string, VentaDiaria>();
    
    // Inicializar todos los días
    dias.forEach(dia => {
      const fecha = format(dia, 'yyyy-MM-dd');
      ventasPorDia.set(fecha, {
        fecha,
        ventas: 0,
        entregas: 0,
        ticketPromedio: 0
      });
    });
    
    // Agregar datos de entregas
    entregas.forEach(entrega => {
      const fecha = format(new Date(entrega.fecha), 'yyyy-MM-dd');
      const ventaDia = ventasPorDia.get(fecha);
      
      if (ventaDia) {
        ventaDia.ventas += entrega.total;
        ventaDia.entregas += 1;
      }
    });
    
    // Calcular ticket promedio
    ventasPorDia.forEach(venta => {
      venta.ticketPromedio = venta.entregas > 0 ? venta.ventas / venta.entregas : 0;
    });
    
    return Array.from(ventasPorDia.values());
  }

  private static generarResumenVentas(entregas: Entrega[], entregasAnterior: Entrega[]): ResumenVentas {
    const totalVentas = entregas.reduce((sum, e) => sum + e.total, 0);
    const totalEntregas = entregas.length;
    const ticketPromedio = totalEntregas > 0 ? totalVentas / totalEntregas : 0;
    
    const ventasAnterior = entregasAnterior.reduce((sum, e) => sum + e.total, 0);
    const crecimientoMensual = ventasAnterior > 0 ? ((totalVentas - ventasAnterior) / ventasAnterior) * 100 : 0;
    
    // Estadísticas de pago
    const entregasPagadas = entregas.filter(e => e.pagado).length;
    const entregasPendientes = entregas.filter(e => !e.pagado).length;
    const ventasPagadas = entregas.filter(e => e.pagado).reduce((sum, e) => sum + e.total, 0);
    const ventasPendientes = entregas.filter(e => !e.pagado).reduce((sum, e) => sum + e.total, 0);
    
    // Métodos de pago
    const pagosEfectivo = entregas.filter(e => e.pagado && e.medioPago === 'efectivo').length;
    const pagosTransferencia = entregas.filter(e => e.pagado && e.medioPago === 'transferencia').length;
    const pagosTarjeta = entregas.filter(e => e.pagado && e.medioPago === 'tarjeta').length;
    
    return {
      totalVentas,
      totalEntregas,
      ticketPromedio,
      crecimientoMensual,
      // Estadísticas de pago
      entregasPagadas,
      entregasPendientes,
      ventasPagadas,
      ventasPendientes,
      pagosEfectivo,
      pagosTransferencia,
      pagosTarjeta
    };
  }

  private static calcularMetodosPago(entregas: Entrega[]): MetodoPago[] {
    const totalMontoPagado = entregas.filter(e => e.pagado).reduce((sum, e) => sum + e.total, 0);
    
    const metodos = [
      {
        metodo: 'Efectivo',
        cantidad: entregas.filter(e => e.pagado && e.medioPago === 'efectivo').length,
        monto: entregas.filter(e => e.pagado && e.medioPago === 'efectivo').reduce((sum, e) => sum + e.total, 0)
      },
      {
        metodo: 'Transferencia',
        cantidad: entregas.filter(e => e.pagado && e.medioPago === 'transferencia').length,
        monto: entregas.filter(e => e.pagado && e.medioPago === 'transferencia').reduce((sum, e) => sum + e.total, 0)
      },
      {
        metodo: 'Tarjeta',
        cantidad: entregas.filter(e => e.pagado && e.medioPago === 'tarjeta').length,
        monto: entregas.filter(e => e.pagado && e.medioPago === 'tarjeta').reduce((sum, e) => sum + e.total, 0)
      }
    ];

    return metodos.map(metodo => ({
      ...metodo,
      porcentaje: totalMontoPagado > 0 ? (metodo.monto / totalMontoPagado) * 100 : 0
    }));
  }

  private static calcularDiasVencimiento(ultimaEntrega?: Date): number {
    if (!ultimaEntrega) return 0;
    const hoy = new Date();
    const diferencia = hoy.getTime() - ultimaEntrega.getTime();
    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
  }

  private static analizarEstadoCuentas(clientes: Cliente[]): EstadoCuenta {
    const clientesConDeuda = clientes.filter(c => (c.saldoPendiente || 0) > 0);
    const totalPendiente = clientesConDeuda.reduce((sum, c) => sum + (c.saldoPendiente || 0), 0);
    const porcentajeMora = clientes.length > 0 ? (clientesConDeuda.length / clientes.length) * 100 : 0;
    const promedioDeuda = clientesConDeuda.length > 0 ? totalPendiente / clientesConDeuda.length : 0;
    
    return {
      totalPendiente,
      clientesConDeuda: clientesConDeuda.length,
      porcentajeMora,
      promedioDeuda
    };
  }

  private static identificarClientesDeudores(clientes: Cliente[]): ClienteDeudor[] {
    return clientes
      .filter(c => (c.saldoPendiente || 0) > 0)
      .map(cliente => ({
        id: cliente.id!,
        nombre: cliente.nombre,
        deuda: cliente.saldoPendiente || 0,
        diasVencimiento: cliente.ultimaEntregaFecha 
          ? differenceInDays(new Date(), new Date(cliente.ultimaEntregaFecha))
          : 0,
        ultimaCompra: cliente.ultimaEntregaFecha || new Date(),
        zona: cliente.zona
      }))
      .sort((a, b) => b.deuda - a.deuda);
  }

  private static calcularCobranzasMensuales(entregas: Entrega[]): CobranzaMensual[] {
    const cobranzasPorMes = new Map<string, CobranzaMensual>();
    
    entregas.forEach(entrega => {
      const fecha = new Date(entrega.fecha);
      const mes = format(fecha, 'MMMM yyyy', { locale: es });
      
      if (!cobranzasPorMes.has(mes)) {
        cobranzasPorMes.set(mes, {
          mes,
          cobrado: 0,
          pendiente: 0,
          porcentajeCobro: 0
        });
      }
      
      const cobranza = cobranzasPorMes.get(mes)!;
      if (entrega.pagado) {
        cobranza.cobrado += entrega.total;
      } else {
        cobranza.pendiente += entrega.total;
      }
    });
    
    // Calcular porcentaje de cobro
    cobranzasPorMes.forEach(cobranza => {
      const total = cobranza.cobrado + cobranza.pendiente;
      cobranza.porcentajeCobro = total > 0 ? (cobranza.cobrado / total) * 100 : 0;
    });
    
    return Array.from(cobranzasPorMes.values());
  }

  private static async analizarTendenciaMora(): Promise<TendenciaMora[]> {
    // Simular datos históricos de mora
    const meses = eachMonthOfInterval({
      start: subMonths(new Date(), 12),
      end: new Date()
    });
    
    return meses.map(mes => ({
      fecha: format(mes, 'MMM yyyy', { locale: es }),
      porcentajeMora: Math.random() * 20 + 10, // Simulado
      clientesConDeuda: Math.floor(Math.random() * 50 + 20) // Simulado
    }));
  }

  private static proyectarCobranzas(entregas: Entrega[]): ProyeccionCobranza[] {
    const proximosMeses = eachMonthOfInterval({
      start: new Date(),
      end: new Date(new Date().setMonth(new Date().getMonth() + 6))
    });
    
    const promedioMensual = entregas.reduce((sum, e) => sum + e.total, 0) / 3; // Promedio últimos 3 meses
    
    return proximosMeses.map(mes => ({
      mes: format(mes, 'MMM yyyy', { locale: es }),
      proyeccion: promedioMensual * (0.9 + Math.random() * 0.2), // Variación ±10%
      confianza: 75 + Math.random() * 20 // 75-95% confianza
    }));
  }

  private static async obtenerHistoricoEntregas(meses: number): Promise<Entrega[]> {
    const fechaInicio = subMonths(new Date(), meses);
    return FirebaseService.getEntregasByDateRange(fechaInicio, new Date());
  }

  private static async obtenerKPIsHistoricos(_meses: number): Promise<KPI[]> {
    void _meses; // evitar warning de variable no usada
    // Implementar cuando los KPIs estén disponibles
    return [];
  }

  private static analizarCrecimiento(entregas: Entrega[]): CrecimientoVenta[] {
    const ventasPorMes = this.calcularVentasMensuales(entregas);
    
    return ventasPorMes.map((venta, index) => {
      const ventaAnterior = ventasPorMes[index - 1];
      const crecimiento = ventaAnterior 
        ? ((venta.ventas - ventaAnterior.ventas) / ventaAnterior.ventas) * 100
        : 0;
      
      return {
        periodo: venta.mes,
        ventas: venta.ventas,
        crecimiento
      };
    });
  }

  private static analizarEstacionalidad(entregas: Entrega[]): Estacionalidad[] {
    const ventasPorMes = new Map<number, number[]>();
    
    entregas.forEach(entrega => {
      const mes = new Date(entrega.fecha).getMonth();
      if (!ventasPorMes.has(mes)) {
        ventasPorMes.set(mes, []);
      }
      ventasPorMes.get(mes)!.push(entrega.total);
    });
    
    const promedioGeneral = entregas.reduce((sum, e) => sum + e.total, 0) / entregas.length;
    
    return Array.from({ length: 12 }, (_, i) => {
      const ventasDelMes = ventasPorMes.get(i) || [];
      const ventasPromedio = ventasDelMes.length > 0 
        ? ventasDelMes.reduce((sum, v) => sum + v, 0) / ventasDelMes.length
        : 0;
      const indice = promedioGeneral > 0 ? ventasPromedio / promedioGeneral : 1;
      
      return {
        mes: format(new Date(2024, i, 1), 'MMMM', { locale: es }),
        indice,
        ventasPromedio
      };
    });
  }

  private static generarPredicciones(entregas: Entrega[]): Prediccion[] {
    const proximosMeses = eachMonthOfInterval({
      start: new Date(),
      end: new Date(new Date().setMonth(new Date().getMonth() + 6))
    });
    
    const tendencia = this.analizarCrecimiento(entregas);
    const crecimientoPromedio = tendencia.reduce((sum, t) => sum + t.crecimiento, 0) / tendencia.length;
    const ventasRecientes = entregas
      .filter(e => new Date(e.fecha) >= subMonths(new Date(), 3))
      .reduce((sum, e) => sum + e.total, 0) / 3;
    
    return proximosMeses.map((mes, index) => ({
      fecha: format(mes, 'MMM yyyy', { locale: es }),
      ventasPredichas: ventasRecientes * Math.pow(1 + crecimientoPromedio / 100, index + 1),
      confianza: Math.max(50, 90 - index * 10) // Menor confianza a mayor distancia
    }));
  }

  private static analizarEvolucionKPIs(kpis: KPI[]): KPIEvolucion[] {
    return kpis.map(kpi => ({
      fecha: format(new Date(kpi.fecha), 'MMM yyyy', { locale: es }),
      litrosVendidos: kpi.litrosVendidos,
      cobranzasTotal: kpi.cobranzasTotal,
      clientesAtendidos: kpi.clientesAtendidos,
      eficiencia: kpi.clientesAtendidos > 0 ? kpi.litrosVendidos / kpi.clientesAtendidos : 0
    }));
  }

  private static compararPeriodosExtendido(entregas: Entrega[]): AnalisisComparativo {
    const fechaActual = new Date();
    const fechaAnterior = subMonths(fechaActual, 6);
    
    const entregasActuales = entregas.filter(e => new Date(e.fecha) >= fechaAnterior);
    const entregasAnteriores = entregas.filter(e => 
      new Date(e.fecha) >= subMonths(fechaAnterior, 6) && 
      new Date(e.fecha) < fechaAnterior
    );
    
    const ventasActuales = entregasActuales.reduce((sum, e) => sum + e.total, 0);
    const ventasAnteriores = entregasAnteriores.reduce((sum, e) => sum + e.total, 0);
    const clientesActuales = new Set(entregasActuales.map(e => e.clienteId)).size;
    const clientesAnteriores = new Set(entregasAnteriores.map(e => e.clienteId)).size;
    
    return {
      periodoActual: 'Últimos 6 meses',
      periodoAnterior: '6 meses anteriores',
      metricas: {
        ventas: this.compararPeriodos(entregasActuales, entregasAnteriores),
        clientes: {
          ventasActual: clientesActuales,
          ventasAnterior: clientesAnteriores,
          variacion: clientesActuales - clientesAnteriores,
          variacionPorcentual: clientesAnteriores > 0 ? ((clientesActuales - clientesAnteriores) / clientesAnteriores) * 100 : 0
        },
        eficiencia: {
          ventasActual: clientesActuales > 0 ? ventasActuales / clientesActuales : 0,
          ventasAnterior: clientesAnteriores > 0 ? ventasAnteriores / clientesAnteriores : 0,
          variacion: 0,
          variacionPorcentual: 0
        }
      }
    };
  }

  private static segmentarClientes(clientes: Cliente[], entregas: Entrega[]): SegmentacionCliente[] {
    const clientesConVentas = new Map<string, number>();
    
    entregas.forEach(entrega => {
      const actual = clientesConVentas.get(entrega.clienteId) || 0;
      clientesConVentas.set(entrega.clienteId, actual + entrega.total);
    });
    
    const segmentos = {
      premium: { cantidad: 0, ingresoPromedio: 0, total: 0 },
      regular: { cantidad: 0, ingresoPromedio: 0, total: 0 },
      ocasional: { cantidad: 0, ingresoPromedio: 0, total: 0 }
    };
    
    clientesConVentas.forEach(ventas => {
      if (ventas > 5000) {
        segmentos.premium.cantidad++;
        segmentos.premium.total += ventas;
      } else if (ventas > 1000) {
        segmentos.regular.cantidad++;
        segmentos.regular.total += ventas;
      } else {
        segmentos.ocasional.cantidad++;
        segmentos.ocasional.total += ventas;
      }
    });
    
    const totalClientes = clientes.length;
    
    return [
      {
        segmento: 'Premium',
        cantidad: segmentos.premium.cantidad,
        porcentaje: totalClientes > 0 ? (segmentos.premium.cantidad / totalClientes) * 100 : 0,
        ingresoPromedio: segmentos.premium.cantidad > 0 ? segmentos.premium.total / segmentos.premium.cantidad : 0
      },
      {
        segmento: 'Regular',
        cantidad: segmentos.regular.cantidad,
        porcentaje: totalClientes > 0 ? (segmentos.regular.cantidad / totalClientes) * 100 : 0,
        ingresoPromedio: segmentos.regular.cantidad > 0 ? segmentos.regular.total / segmentos.regular.cantidad : 0
      },
      {
        segmento: 'Ocasional',
        cantidad: segmentos.ocasional.cantidad,
        porcentaje: totalClientes > 0 ? (segmentos.ocasional.cantidad / totalClientes) * 100 : 0,
        ingresoPromedio: segmentos.ocasional.cantidad > 0 ? segmentos.ocasional.total / segmentos.ocasional.cantidad : 0
      }
    ];
  }

  private static analizarFrecuenciaCompras(clientes: Cliente[]): FrecuenciaCompra[] {
    const frecuencias = {
      semanal: { clientes: 0, ingresoPromedio: 0 },
      quincenal: { clientes: 0, ingresoPromedio: 0 },
      mensual: { clientes: 0, ingresoPromedio: 0 }
    };
    
    clientes.forEach(cliente => {
      const frecuencia = cliente.frecuenciaVisita;
      if (frecuencias[frecuencia]) {
        frecuencias[frecuencia].clientes++;
        frecuencias[frecuencia].ingresoPromedio += cliente.total || 0;
      }
    });
    
    return Object.entries(frecuencias).map(([freq, data]) => ({
      frecuencia: freq.charAt(0).toUpperCase() + freq.slice(1),
      clientes: data.clientes,
      ingresoPromedio: data.clientes > 0 ? data.ingresoPromedio / data.clientes : 0,
      retencion: 85 + Math.random() * 15 // Simulado
    }));
  }

  private static identificarClientesTop(clientes: Cliente[], entregas: Entrega[]): ClienteTop[] {
    const clientesConVentas = new Map<string, { cliente: Cliente, totalCompras: number, frecuencia: number }>();
    
    entregas.forEach(entrega => {
      const cliente = clientes.find(c => c.id === entrega.clienteId);
      if (cliente) {
        const actual = clientesConVentas.get(entrega.clienteId) || { cliente, totalCompras: 0, frecuencia: 0 };
        actual.totalCompras += entrega.total;
        actual.frecuencia++;
        clientesConVentas.set(entrega.clienteId, actual);
      }
    });
    
    return Array.from(clientesConVentas.values())
      .sort((a, b) => b.totalCompras - a.totalCompras)
      .slice(0, 10)
      .map(({ cliente, totalCompras, frecuencia }) => ({
        id: cliente.id!,
        nombre: cliente.nombre,
        totalCompras,
        frecuenciaVisitas: frecuencia,
        ultimaCompra: cliente.ultimaEntregaFecha || new Date(),
        zona: cliente.zona
      }));
  }

  private static analizarDistribucionGeografica(clientes: Cliente[], entregas: Entrega[]): AnalisisGeografico[] {
    const zonas = new Map<string, { clientes: Set<string>, ventas: number }>();
    
    entregas.forEach(entrega => {
      const cliente = clientes.find(c => c.id === entrega.clienteId);
      const zona = cliente?.zona || 'Sin zona';
      
      if (!zonas.has(zona)) {
        zonas.set(zona, { clientes: new Set(), ventas: 0 });
      }
      
      const zoneData = zonas.get(zona)!;
      zoneData.clientes.add(entrega.clienteId);
      zoneData.ventas += entrega.total;
    });
    
    return Array.from(zonas.entries()).map(([zona, data]) => ({
      zona,
      clientes: data.clientes.size,
      ventas: data.ventas,
      densidad: data.clientes.size > 0 ? data.ventas / data.clientes.size : 0
    }));
  }

  private static async analizarRetencionClientes(): Promise<RetencionCliente[]> {
    const meses = eachMonthOfInterval({
      start: subMonths(new Date(), 6),
      end: new Date()
    });
    
    return meses.map(mes => ({
      periodo: format(mes, 'MMM yyyy', { locale: es }),
      clientesNuevos: Math.floor(Math.random() * 20 + 5),
      clientesRetenidos: Math.floor(Math.random() * 100 + 50),
      tasaRetencion: 70 + Math.random() * 25
    }));
  }
} 