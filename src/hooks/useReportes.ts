import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ReportesService, 
  VentasReporte, 
  CobranzasReporte, 
  TendenciasReporte, 
  ClientesReporte,
  FiltrosReporte 
} from '../services/reportesService';
import { ExportService } from '../services/exportService';
import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import toast from 'react-hot-toast';

export type TipoReporte = 'ventas' | 'cobranzas' | 'tendencias' | 'clientes';
export type PeriodoPredefinido = 'hoy' | 'semana' | 'mes' | 'trimestre' | 'año' | 'personalizado';

interface AlertaConfig {
  activa: boolean;
  umbral: number;
  tipo: 'ventas' | 'mora' | 'clientes';
  email?: string;
}

interface UseReportesReturn {
  // Estados de datos
  ventasReporte: VentasReporte | null;
  cobranzasReporte: CobranzasReporte | null;
  tendenciasReporte: TendenciasReporte | null;
  clientesReporte: ClientesReporte | null;
  
  // Estados de UI
  loading: boolean;
  error: string | null;
  tipoReporteActivo: TipoReporte;
  filtros: FiltrosReporte;
  
  // Configuración
  alertas: AlertaConfig[];
  configuracionPersonalizada: ConfiguracionReporte;
  
  // Acciones principales
  cargarReporte: (tipo: TipoReporte) => Promise<void>;
  actualizarFiltros: (nuevosFiltros: Partial<FiltrosReporte>) => void;
  aplicarPeriodoPredefinido: (periodo: PeriodoPredefinido) => void;
  
  // Exportación
  exportarReportePDF: (tipo: TipoReporte) => Promise<void>;
  exportarReporteCSV: (tipo: TipoReporte) => Promise<void>;
  exportarTodosReportes: () => Promise<void>;
  
  // Alertas y notificaciones
  configurarAlerta: (alerta: AlertaConfig) => void;
  verificarAlertas: () => Promise<void>;
  
  // Comparaciones
  compararPeriodos: (fechaInicio1: Date, fechaFin1: Date, fechaInicio2: Date, fechaFin2: Date) => Promise<any>;
  
  // Análisis avanzado
  generarInsights: () => Promise<string[]>;
  detectarAnomalias: () => Promise<any[]>;
  
  // Personalización
  guardarConfiguracion: (config: Partial<ConfiguracionReporte>) => void;
  restaurarConfiguracion: () => void;
}

interface ConfiguracionReporte {
  graficosVisibles: {
    ventas: boolean;
    tendencias: boolean;
    geografico: boolean;
    productos: boolean;
  };
  metricsPreferidas: string[];
  formatoFecha: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  moneda: 'ARS' | 'USD';
  decimales: number;
  temaGraficos: 'claro' | 'oscuro' | 'auto';
}

const CONFIGURACION_DEFAULT: ConfiguracionReporte = {
  graficosVisibles: {
    ventas: true,
    tendencias: true,
    geografico: true,
    productos: true
  },
  metricsPreferidas: ['ventas', 'clientes', 'crecimiento'],
  formatoFecha: 'DD/MM/YYYY',
  moneda: 'ARS',
  decimales: 2,
  temaGraficos: 'auto'
};

export const useReportes = (): UseReportesReturn => {
  // Estados principales
  const [ventasReporte, setVentasReporte] = useState<VentasReporte | null>(null);
  const [cobranzasReporte, setCobranzasReporte] = useState<CobranzasReporte | null>(null);
  const [tendenciasReporte, setTendenciasReporte] = useState<TendenciasReporte | null>(null);
  const [clientesReporte, setClientesReporte] = useState<ClientesReporte | null>(null);
  
  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipoReporteActivo, setTipoReporteActivo] = useState<TipoReporte>('ventas');
  
  // Filtros
  const [filtros, setFiltros] = useState<FiltrosReporte>({
    fechaInicio: startOfMonth(new Date()),
    fechaFin: endOfMonth(new Date()),
    tipoReporte: 'ventas'
  });
  
  // Configuración y alertas
  const [alertas, setAlertas] = useState<AlertaConfig[]>([]);
  const [configuracionPersonalizada, setConfiguracionPersonalizada] = useState<ConfiguracionReporte>(
    CONFIGURACION_DEFAULT
  );

  // Cargar configuración desde localStorage
  useEffect(() => {
    const configGuardada = localStorage.getItem('reportes-config');
    if (configGuardada) {
      try {
        const config = JSON.parse(configGuardada);
        setConfiguracionPersonalizada({ ...CONFIGURACION_DEFAULT, ...config });
      } catch (error) {
        console.error('Error cargando configuración:', error);
      }
    }

    const alertasGuardadas = localStorage.getItem('reportes-alertas');
    if (alertasGuardadas) {
      try {
        const alertasConfig = JSON.parse(alertasGuardadas);
        setAlertas(alertasConfig);
      } catch (error) {
        console.error('Error cargando alertas:', error);
      }
    }
  }, []);

  // Cargar reporte inicial
  useEffect(() => {
    cargarReporte(tipoReporteActivo);
  }, [filtros]);

  // Función principal para cargar reportes
  const cargarReporte = useCallback(async (tipo: TipoReporte) => {
    try {
      setLoading(true);
      setError(null);
      setTipoReporteActivo(tipo);

      const filtrosConTipo = { ...filtros, tipoReporte: tipo };

      switch (tipo) {
        case 'ventas':
          const ventasData = await ReportesService.generarReporteVentas(filtrosConTipo);
          setVentasReporte(ventasData);
          break;
          
        case 'cobranzas':
          const cobranzasData = await ReportesService.generarReporteCobranzas(filtrosConTipo);
          setCobranzasReporte(cobranzasData);
          break;
          
        case 'tendencias':
          const tendenciasData = await ReportesService.generarReporteTendencias(filtrosConTipo);
          setTendenciasReporte(tendenciasData);
          break;
          
        case 'clientes':
          const clientesData = await ReportesService.generarReporteClientes(filtrosConTipo);
          setClientesReporte(clientesData);
          break;
      }

      // Verificar alertas después de cargar datos
      await verificarAlertas();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar reporte';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  // Actualizar filtros
  const actualizarFiltros = useCallback((nuevosFiltros: Partial<FiltrosReporte>) => {
    setFiltros(prev => ({ ...prev, ...nuevosFiltros }));
  }, []);

  // Aplicar períodos predefinidos
  const aplicarPeriodoPredefinido = useCallback((periodo: PeriodoPredefinido) => {
    const hoy = new Date();
    let fechaInicio: Date;
    let fechaFin: Date;

    switch (periodo) {
      case 'hoy':
        fechaInicio = new Date(hoy);
        fechaInicio.setHours(0, 0, 0, 0);
        fechaFin = new Date(hoy);
        fechaFin.setHours(23, 59, 59, 999);
        break;
        
      case 'semana':
        fechaInicio = new Date(hoy);
        fechaInicio.setDate(hoy.getDate() - 7);
        fechaFin = hoy;
        break;
        
      case 'mes':
        fechaInicio = startOfMonth(hoy);
        fechaFin = endOfMonth(hoy);
        break;
        
      case 'trimestre':
        fechaInicio = new Date(hoy.getFullYear(), Math.floor(hoy.getMonth() / 3) * 3, 1);
        fechaFin = hoy;
        break;
        
      case 'año':
        fechaInicio = startOfYear(hoy);
        fechaFin = endOfYear(hoy);
        break;
        
      default:
        return; // No cambiar para período personalizado
    }

    actualizarFiltros({ fechaInicio, fechaFin });
  }, [actualizarFiltros]);

  // Exportación a PDF
  const exportarReportePDF = useCallback(async (tipo: TipoReporte) => {
    try {
      const reporteData = obtenerDatosReporte(tipo);
      if (!reporteData) {
        toast.error('No hay datos para exportar');
        return;
      }

      const blob = await generarPDFReporte(tipo, reporteData);
      descargarArchivo(blob, `reporte-${tipo}-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Reporte exportado exitosamente');
    } catch (error) {
      toast.error('Error al exportar reporte');
      console.error('Error exportando PDF:', error);
    }
  }, [ventasReporte, cobranzasReporte, tendenciasReporte, clientesReporte]);

  // Exportación a CSV
  const exportarReporteCSV = useCallback(async (tipo: TipoReporte) => {
    try {
      const reporteData = obtenerDatosReporte(tipo);
      if (!reporteData) {
        toast.error('No hay datos para exportar');
        return;
      }

      const blob = await generarCSVReporte(tipo, reporteData);
      descargarArchivo(blob, `reporte-${tipo}-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Reporte exportado exitosamente');
    } catch (error) {
      toast.error('Error al exportar reporte');
      console.error('Error exportando CSV:', error);
    }
  }, [ventasReporte, cobranzasReporte, tendenciasReporte, clientesReporte]);

  // Exportar todos los reportes
  const exportarTodosReportes = useCallback(async () => {
    try {
      const reportes: TipoReporte[] = ['ventas', 'cobranzas', 'tendencias', 'clientes'];
      const promises = reportes.map(tipo => exportarReportePDF(tipo));
      await Promise.all(promises);
      toast.success('Todos los reportes exportados exitosamente');
    } catch (error) {
      toast.error('Error al exportar reportes');
      console.error('Error exportando todos los reportes:', error);
    }
  }, [exportarReportePDF]);

  // Configurar alertas
  const configurarAlerta = useCallback((alerta: AlertaConfig) => {
    setAlertas(prev => {
      const nuevasAlertas = prev.filter(a => a.tipo !== alerta.tipo);
      nuevasAlertas.push(alerta);
      localStorage.setItem('reportes-alertas', JSON.stringify(nuevasAlertas));
      return nuevasAlertas;
    });
  }, []);

  // Verificar alertas
  const verificarAlertas = useCallback(async () => {
    if (alertas.length === 0) return;

    try {
      for (const alerta of alertas.filter(a => a.activa)) {
        let valorActual = 0;
        
        switch (alerta.tipo) {
          case 'ventas':
            valorActual = ventasReporte?.resumenGeneral.totalVentas || 0;
            break;
          case 'mora':
            valorActual = cobranzasReporte?.estadoCuentas.porcentajeMora || 0;
            break;
          case 'clientes':
            valorActual = clientesReporte?.segmentacion.reduce((sum, s) => sum + s.cantidad, 0) || 0;
            break;
        }

        if (valorActual >= alerta.umbral) {
          toast.success(`🚨 Alerta: ${alerta.tipo} ha alcanzado ${valorActual} (umbral: ${alerta.umbral})`);
          
          // Enviar email si está configurado
          if (alerta.email) {
            await enviarNotificacionEmail(alerta, valorActual);
          }
        }
      }
    } catch (error) {
      console.error('Error verificando alertas:', error);
    }
  }, [alertas, ventasReporte, cobranzasReporte, clientesReporte]);

  // Comparar períodos
  const compararPeriodos = useCallback(async (
    fechaInicio1: Date, 
    fechaFin1: Date, 
    fechaInicio2: Date, 
    fechaFin2: Date
  ) => {
    try {
      const [reporte1, reporte2] = await Promise.all([
        ReportesService.generarReporteVentas({
          fechaInicio: fechaInicio1,
          fechaFin: fechaFin1,
          tipoReporte: 'ventas'
        }),
        ReportesService.generarReporteVentas({
          fechaInicio: fechaInicio2,
          fechaFin: fechaFin2,
          tipoReporte: 'ventas'
        })
      ]);

      return {
        periodo1: {
          ventas: reporte1.resumenGeneral.totalVentas,
          entregas: reporte1.resumenGeneral.totalEntregas,
          ticket: reporte1.resumenGeneral.ticketPromedio
        },
        periodo2: {
          ventas: reporte2.resumenGeneral.totalVentas,
          entregas: reporte2.resumenGeneral.totalEntregas,
          ticket: reporte2.resumenGeneral.ticketPromedio
        },
        diferencias: {
          ventas: reporte1.resumenGeneral.totalVentas - reporte2.resumenGeneral.totalVentas,
          entregas: reporte1.resumenGeneral.totalEntregas - reporte2.resumenGeneral.totalEntregas,
          ticket: reporte1.resumenGeneral.ticketPromedio - reporte2.resumenGeneral.ticketPromedio
        }
      };
    } catch (error) {
      console.error('Error comparando períodos:', error);
      throw error;
    }
  }, []);

  // Generar insights automáticos
  const generarInsights = useCallback(async (): Promise<string[]> => {
    const insights: string[] = [];

    try {
      if (ventasReporte) {
        const { resumenGeneral, comparacionAnterior } = ventasReporte;
        
        if (comparacionAnterior.variacionPorcentual > 10) {
          insights.push(`📈 Excelente crecimiento en ventas: +${comparacionAnterior.variacionPorcentual.toFixed(1)}%`);
        } else if (comparacionAnterior.variacionPorcentual < -10) {
          insights.push(`📉 Atención: Caída en ventas del ${Math.abs(comparacionAnterior.variacionPorcentual).toFixed(1)}%`);
        }

        if (resumenGeneral.ticketPromedio > 500) {
          insights.push(`💰 Ticket promedio alto: $${resumenGeneral.ticketPromedio.toFixed(2)}`);
        }
      }

      if (cobranzasReporte) {
        const { estadoCuentas } = cobranzasReporte;
        
        if (estadoCuentas.porcentajeMora > 30) {
          insights.push(`⚠️ Alto nivel de morosidad: ${estadoCuentas.porcentajeMora.toFixed(1)}%`);
        } else if (estadoCuentas.porcentajeMora < 15) {
          insights.push(`✅ Excelente gestión de cobranzas: ${estadoCuentas.porcentajeMora.toFixed(1)}% de mora`);
        }
      }

      if (clientesReporte) {
        const clientesPremium = clientesReporte.segmentacion.find(s => s.segmento === 'Premium');
        if (clientesPremium && clientesPremium.porcentaje > 20) {
          insights.push(`⭐ Gran base de clientes premium: ${clientesPremium.porcentaje.toFixed(1)}%`);
        }
      }

      if (insights.length === 0) {
        insights.push('📊 Los datos muestran un rendimiento estable en todos los indicadores');
      }

    } catch (error) {
      console.error('Error generando insights:', error);
      insights.push('❌ Error al generar análisis automático');
    }

    return insights;
  }, [ventasReporte, cobranzasReporte, clientesReporte]);

  // Detectar anomalías
  const detectarAnomalias = useCallback(async () => {
    const anomalias: any[] = [];

    try {
      if (ventasReporte?.ventasPorDia) {
        const ventasDiarias = ventasReporte.ventasPorDia.map(v => v.ventas);
        const promedio = ventasDiarias.reduce((sum, v) => sum + v, 0) / ventasDiarias.length;
        const desviacion = Math.sqrt(ventasDiarias.reduce((sum, v) => sum + Math.pow(v - promedio, 2), 0) / ventasDiarias.length);
        
        ventasReporte.ventasPorDia.forEach(venta => {
          if (Math.abs(venta.ventas - promedio) > 2 * desviacion) {
            anomalias.push({
              tipo: 'ventas_atipicas',
              fecha: venta.fecha,
              valor: venta.ventas,
              promedio,
              descripcion: `Ventas ${venta.ventas > promedio ? 'excepcionalmente altas' : 'excepcionalmente bajas'}`
            });
          }
        });
      }

      if (cobranzasReporte?.clientesDeudores) {
        const clientesConDeudaAlta = cobranzasReporte.clientesDeudores.filter(c => c.deuda > 5000);
        clientesConDeudaAlta.forEach(cliente => {
          anomalias.push({
            tipo: 'deuda_alta',
            clienteId: cliente.id,
            clienteNombre: cliente.nombre,
            valor: cliente.deuda,
            descripcion: `Cliente con deuda elevada: $${cliente.deuda.toFixed(2)}`
          });
        });
      }

    } catch (error) {
      console.error('Error detectando anomalías:', error);
    }

    return anomalias;
  }, [ventasReporte, cobranzasReporte]);

  // Guardar configuración
  const guardarConfiguracion = useCallback((config: Partial<ConfiguracionReporte>) => {
    const nuevaConfig = { ...configuracionPersonalizada, ...config };
    setConfiguracionPersonalizada(nuevaConfig);
    localStorage.setItem('reportes-config', JSON.stringify(nuevaConfig));
    toast.success('Configuración guardada');
  }, [configuracionPersonalizada]);

  // Restaurar configuración
  const restaurarConfiguracion = useCallback(() => {
    setConfiguracionPersonalizada(CONFIGURACION_DEFAULT);
    localStorage.removeItem('reportes-config');
    toast.success('Configuración restaurada');
  }, []);

  // Funciones auxiliares
  const obtenerDatosReporte = (tipo: TipoReporte) => {
    switch (tipo) {
      case 'ventas': return ventasReporte;
      case 'cobranzas': return cobranzasReporte;
      case 'tendencias': return tendenciasReporte;
      case 'clientes': return clientesReporte;
      default: return null;
    }
  };

  const generarPDFReporte = async (tipo: TipoReporte, data: any): Promise<Blob> => {
    // Implementar generación de PDF específica por tipo
    return new Blob(['PDF generado'], { type: 'application/pdf' });
  };

  const generarCSVReporte = async (tipo: TipoReporte, data: any): Promise<Blob> => {
    // Implementar generación de CSV específica por tipo
    let csvContent = '';
    
    switch (tipo) {
      case 'ventas':
        csvContent = 'Fecha,Ventas,Entregas,Ticket Promedio\n';
        data.ventasPorDia.forEach((venta: any) => {
          csvContent += `${venta.fecha},${venta.ventas},${venta.entregas},${venta.ticketPromedio}\n`;
        });
        break;
      // Implementar otros tipos...
    }
    
    return new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  };

  const descargarArchivo = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const enviarNotificacionEmail = async (alerta: AlertaConfig, valor: number) => {
    // Implementar envío de email
    console.log(`Enviando notificación de ${alerta.tipo} a ${alerta.email}: ${valor}`);
  };

  // Memoizar datos computados
  const datosComputados = useMemo(() => {
    return {
      totalVentasActuales: ventasReporte?.resumenGeneral.totalVentas || 0,
      crecimientoPromedio: ventasReporte?.resumenGeneral.crecimientoMensual || 0,
      clientesActivos: clientesReporte?.segmentacion.reduce((sum, s) => sum + s.cantidad, 0) || 0,
      morosidadActual: cobranzasReporte?.estadoCuentas.porcentajeMora || 0
    };
  }, [ventasReporte, clientesReporte, cobranzasReporte]);

  return {
    // Estados de datos
    ventasReporte,
    cobranzasReporte,
    tendenciasReporte,
    clientesReporte,
    
    // Estados de UI
    loading,
    error,
    tipoReporteActivo,
    filtros,
    
    // Configuración
    alertas,
    configuracionPersonalizada,
    
    // Acciones principales
    cargarReporte,
    actualizarFiltros,
    aplicarPeriodoPredefinido,
    
    // Exportación
    exportarReportePDF,
    exportarReporteCSV,
    exportarTodosReportes,
    
    // Alertas y notificaciones
    configurarAlerta,
    verificarAlertas,
    
    // Comparaciones
    compararPeriodos,
    
    // Análisis avanzado
    generarInsights,
    detectarAnomalias,
    
    // Personalización
    guardarConfiguracion,
    restaurarConfiguracion,

    // Datos computados (bonus)
    datosComputados
  };
}; 