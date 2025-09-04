import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Download,
  Eye,
  AlertTriangle,
  Target,
  Zap,
  Bell,
  Settings,
  RefreshCw,
  FileText
} from 'lucide-react';
import { useReportes, TipoReporte } from '../hooks/useReportes';
import { FiltrosReportes } from '../components/reportes/FiltrosReportes';
import {
  GraficoVentasTemporal,
  GraficoBarras,
  GraficoPie,
  GraficoCombinado,
  GraficoRadar,
  MetricasRapidas,
  ProgresoCircular
} from '../components/reportes/GraficosReportes';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DatosGrafico {
  [key: string]: string | number;
}

export const Reportes: React.FC = () => {
  const {
    ventasReporte,
    cobranzasReporte,
    tendenciasReporte,
    clientesReporte,
    loading,
    error,
    tipoReporteActivo,
    filtros,
    configuracionPersonalizada,
    cargarReporte,
    actualizarFiltros,
    aplicarPeriodoPredefinido,
    exportarReportePDF,
    exportarReporteCSV,
    exportarTodosReportes,
    generarInsights,
    detectarAnomalias
  } = useReportes();

  const [vistaActual, setVistaActual] = useState<'dashboard' | 'detalle'>('dashboard');
  const [insights, setInsights] = useState<string[]>([]);
  const [anomalias, setAnomalias] = useState<Array<{ descripcion: string; fecha?: string; tipo: string }>>([]);

  // Datos mock para zonas y clientes (en producción vendría del servicio)
  const zonas = ['Centro', 'Norte', 'Sur', 'Este', 'Oeste'];
  const clientes = [
    { id: '1', nombre: 'Cliente A', zona: 'Centro' },
    { id: '2', nombre: 'Cliente B', zona: 'Norte' },
    // Más clientes...
  ];

  // Cargar insights y anomalías cuando cambien los datos
  useEffect(() => {
    const cargarAnalisisAvanzado = async () => {
      try {
        const [insightsData, anomaliasData] = await Promise.all([
          generarInsights(),
          detectarAnomalias()
        ]);
        setInsights(insightsData);
        setAnomalias(anomaliasData as Array<{ descripcion: string; fecha?: string; tipo: string }>);
      } catch {
        console.error('Error cargando análisis avanzado');
      }
    };

    if (ventasReporte || cobranzasReporte || tendenciasReporte || clientesReporte) {
      cargarAnalisisAvanzado();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventasReporte, cobranzasReporte, tendenciasReporte, clientesReporte]);

  // Manejar exportación
  const handleExportar = async (tipo: 'pdf' | 'csv') => {
    try {
      if (tipo === 'pdf') {
        await exportarReportePDF(tipoReporteActivo);
      } else {
        await exportarReporteCSV(tipoReporteActivo);
      }
    } catch {
      toast.error('Error al exportar reporte');
    }
  };

  // Tarjetas de reportes principales
  const tarjetasReportes = [
    {
      id: 'ventas' as TipoReporte,
      titulo: 'Ventas',
      descripcion: 'Análisis de ventas, tendencias y productos más vendidos',
      icono: BarChart3,
      color: 'bg-blue-500',
      colorFondo: 'bg-blue-50 dark:bg-blue-900',
      datos: ventasReporte,
      metricas: ventasReporte ? [
        { label: 'Total Ventas', valor: `$${ventasReporte.resumenGeneral.totalVentas.toLocaleString('es-AR')}` },
        { label: 'Entregas', valor: ventasReporte.resumenGeneral.totalEntregas },
        { label: 'Pagadas', valor: ventasReporte.resumenGeneral.entregasPagadas },
        { label: 'Pendientes', valor: ventasReporte.resumenGeneral.entregasPendientes }
      ] : []
    },
    {
      id: 'cobranzas' as TipoReporte,
      titulo: 'Cobranzas',
      descripción: 'Estado de cuentas, morosidad y proyecciones de cobro',
      icono: DollarSign,
      color: 'bg-green-500',
      colorFondo: 'bg-green-50 dark:bg-green-900',
      datos: cobranzasReporte,
      metricas: cobranzasReporte ? [
        { label: 'Total Pendiente', valor: `$${cobranzasReporte.estadoCuentas.totalPendiente.toLocaleString('es-AR')}` },
        { label: 'Clientes con Deuda', valor: cobranzasReporte.estadoCuentas.clientesConDeuda },
        { label: '% Morosidad', valor: `${cobranzasReporte.estadoCuentas.porcentajeMora.toFixed(1)}%` },
        { label: 'Deuda Promedio', valor: `$${cobranzasReporte.estadoCuentas.promedioDeuda.toFixed(2)}` }
      ] : []
    },
    {
      id: 'tendencias' as TipoReporte,
      titulo: 'Tendencias',
      descripción: 'Análisis de crecimiento, estacionalidad y predicciones',
      icono: TrendingUp,
      color: 'bg-purple-500',
      colorFondo: 'bg-purple-50 dark:bg-purple-900',
      datos: tendenciasReporte,
      metricas: tendenciasReporte ? [
        { label: 'Crecimiento Promedio', valor: `${tendenciasReporte.crecimientoVentas.reduce((sum, c) => sum + c.crecimiento, 0) / tendenciasReporte.crecimientoVentas.length || 0}%` },
        { label: 'Predicción Próximo Mes', valor: `$${tendenciasReporte.predicciones[0]?.ventasPredichas.toFixed(0) || '0'}` },
        { label: 'Confianza', valor: `${tendenciasReporte.predicciones[0]?.confianza.toFixed(0) || '0'}%` },
        { label: 'Estacionalidad', valor: 'Variable' }
      ] : []
    },
    {
      id: 'clientes' as TipoReporte,
      titulo: 'Clientes',
      descripción: 'Segmentación, comportamiento y análisis geográfico',
      icono: Users,
      color: 'bg-orange-500',
      colorFondo: 'bg-orange-50 dark:bg-orange-900',
      datos: clientesReporte,
      metricas: clientesReporte ? [
        { label: 'Total Clientes', valor: clientesReporte.segmentacion.reduce((sum, s) => sum + s.cantidad, 0) },
        { label: 'Clientes Premium', valor: `${clientesReporte.segmentacion.find(s => s.segmento === 'Premium')?.porcentaje.toFixed(1) || '0'}%` },
        { label: 'Retención', valor: `${clientesReporte.retencionClientes[clientesReporte.retencionClientes.length - 1]?.tasaRetencion.toFixed(1) || '0'}%` },
        { label: 'Top Cliente', valor: clientesReporte.clientesTop[0]?.nombre || 'N/A' }
      ] : []
    }
  ];

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Error al cargar reportes
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <button
            onClick={() => cargarReporte(tipoReporteActivo)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2 inline" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Reportes y Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Análisis completo del rendimiento del negocio
          </p>
        </div>
        
        <div className="flex items-center gap-3">
                     {/* Botón de configuración */}
          <button
            onClick={() => toast.success('Configuración disponible próximamente')}
            className="flex items-center px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurar
          </button>

          {/* Botón exportar todos */}
          <button
            onClick={exportarTodosReportes}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            disabled={loading}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Todo
          </button>
        </div>
      </div>

      {/* Filtros */}
      <FiltrosReportes
        filtros={filtros}
        onFiltrosChange={actualizarFiltros}
        onAplicarPeriodo={aplicarPeriodoPredefinido}
        onExportar={handleExportar}
        loading={loading}
        zonas={zonas}
        clientes={clientes}
      />

      {/* Métricas rápidas */}
      <MetricasRapidas
                 metricas={[
          {
            titulo: 'Ventas Totales',
            valor: ventasReporte ? `$${ventasReporte.resumenGeneral.totalVentas.toLocaleString('es-AR')}` : '$0',
            cambio: ventasReporte?.resumenGeneral.crecimientoMensual || 0,
            icono: <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />,
            color: 'bg-green-100 dark:bg-green-900'
          },
          {
            titulo: 'Clientes Activos',
            valor: clientesReporte?.segmentacion.reduce((sum, s) => sum + s.cantidad, 0) || 0,
            icono: <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
            color: 'bg-blue-100 dark:bg-blue-900'
          },
          {
            titulo: 'Morosidad',
            valor: cobranzasReporte ? `${cobranzasReporte.estadoCuentas.porcentajeMora.toFixed(1)}%` : '0%',
            cambio: cobranzasReporte && cobranzasReporte.estadoCuentas.porcentajeMora > 25 ? -5 : 2,
            icono: <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />,
            color: cobranzasReporte && cobranzasReporte.estadoCuentas.porcentajeMora > 25 ? 'bg-red-100 dark:bg-red-900' : 'bg-yellow-100 dark:bg-yellow-900'
          },
          {
            titulo: 'Eficiencia',
            valor: '87%',
            cambio: 3.2,
            icono: <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
            color: 'bg-purple-100 dark:bg-purple-900'
          },
          {
            titulo: 'Entregas Pagadas',
            valor: ventasReporte ? `${ventasReporte.resumenGeneral.entregasPagadas}` : '0',
            icono: <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />,
            color: 'bg-green-100 dark:bg-green-900'
          },
          {
            titulo: 'Pendientes de Pago',
            valor: ventasReporte ? `${ventasReporte.resumenGeneral.entregasPendientes}` : '0',
            icono: <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />,
            color: 'bg-orange-100 dark:bg-orange-900'
          }
        ]}
      />

      {/* Insights y Anomalías */}
      {(insights.length > 0 || anomalias.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Insights */}
          {insights.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center mb-4">
                <Zap className="w-5 h-5 text-yellow-500 dark:text-yellow-400 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Insights Automáticos
                </h3>
              </div>
              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <div key={index} className="flex items-start p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {insight}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Anomalías */}
          {anomalias.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center mb-4">
                <Bell className="w-5 h-5 text-red-500 dark:text-red-400 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Anomalías Detectadas
                </h3>
              </div>
              <div className="space-y-3">
                {anomalias.slice(0, 3).map((anomalia, index) => (
                  <div key={index} className="flex items-start p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <div className="font-medium">{anomalia.descripcion}</div>
                      {anomalia.fecha && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {format(new Date(anomalia.fecha), 'dd/MM/yyyy', { locale: es })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vista Dashboard vs Detalle */}
      {vistaActual === 'dashboard' ? (
        /* Dashboard - Vista de tarjetas */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tarjetasReportes.map((tarjeta) => (
            <div
              key={tarjeta.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className={`p-3 rounded-lg ${tarjeta.colorFondo}`}>
                      <tarjeta.icono className={`w-6 h-6 ${tarjeta.color.replace('bg-', 'text-')}`} />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {tarjeta.titulo}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {tarjeta.descripcion}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Métricas del reporte */}
                {tarjeta.datos ? (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {tarjeta.metricas.map((metrica, index) => (
                      <div key={index} className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {metrica.valor}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {metrica.label}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-24 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4">
                    {loading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <div className="text-center">
                        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Sin datos disponibles
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Acciones */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setVistaActual('detalle');
                      cargarReporte(tarjeta.id);
                    }}
                    className="flex-1 flex items-center justify-center px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    disabled={loading}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Detalles
                  </button>
                  <button
                    onClick={() => exportarReportePDF(tarjeta.id)}
                    className="flex items-center justify-center px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    disabled={loading}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Vista Detalle - Gráficos específicos */
        <div className="space-y-6">
          {/* Header de detalle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setVistaActual('dashboard')}
                className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                ← Volver al Dashboard
              </button>
              <div className="ml-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white capitalize">
                  Reporte de {tipoReporteActivo}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Análisis detallado del período seleccionado
                </p>
              </div>
            </div>
          </div>

          {/* Gráficos específicos por tipo de reporte */}
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráficos de ventas */}
              {tipoReporteActivo === 'ventas' && ventasReporte && (
                <>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Evolución de Ventas
                    </h3>
                    <GraficoVentasTemporal
                      data={ventasReporte.ventasPorDia as unknown as DatosGrafico[]}
                      height={300}
                      tema={configuracionPersonalizada.temaGraficos === 'oscuro' ? 'oscuro' : 'claro'}
                    />
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Productos Más Vendidos
                    </h3>
                    <GraficoPie
                      data={ventasReporte.topProductos as unknown as DatosGrafico[]}
                      dataKey="porcentaje"
                      nameKey="producto"
                      height={300}
                      tema={configuracionPersonalizada.temaGraficos === 'oscuro' ? 'oscuro' : 'claro'}
                    />
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Métodos de Pago
                    </h3>
                    <GraficoPie
                      data={ventasReporte.metodosPago as unknown as DatosGrafico[]}
                      dataKey="porcentaje"
                      nameKey="metodo"
                      height={300}
                      tema={configuracionPersonalizada.temaGraficos === 'oscuro' ? 'oscuro' : 'claro'}
                    />
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Ventas Mensuales
                    </h3>
                    <GraficoBarras
                      data={ventasReporte.ventasMensuales as unknown as DatosGrafico[]}
                      dataKey="ventas"
                      xAxisKey="mes"
                      height={300}
                      tema={configuracionPersonalizada.temaGraficos === 'oscuro' ? 'oscuro' : 'claro'}
                      mostrarValores={true}
                    />
                  </div>
                </>
              )}

              {/* Gráficos de cobranzas */}
              {tipoReporteActivo === 'cobranzas' && cobranzasReporte && (
                <>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Estado de Cobranzas
                    </h3>
                    <div className="flex items-center justify-center">
                      <ProgresoCircular
                        porcentaje={100 - cobranzasReporte.estadoCuentas.porcentajeMora}
                        size={150}
                        color="#10B981"
                      >
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {(100 - cobranzasReporte.estadoCuentas.porcentajeMora).toFixed(0)}%
                          </div>
                          <div className="text-xs text-gray-500">
                            Cobrado
                          </div>
                        </div>
                      </ProgresoCircular>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Tendencia de Mora
                    </h3>
                    <GraficoVentasTemporal
                      data={cobranzasReporte.tendenciaMora.map(t => ({
                        fecha: t.fecha,
                        ventas: t.porcentajeMora
                      }))}
                      height={300}
                      tema={configuracionPersonalizada.temaGraficos === 'oscuro' ? 'oscuro' : 'claro'}
                    />
                  </div>
                </>
              )}

              {/* Gráficos de clientes */}
              {tipoReporteActivo === 'clientes' && clientesReporte && (
                <>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Segmentación de Clientes
                    </h3>
                    <GraficoPie
                      data={clientesReporte.segmentacion as unknown as DatosGrafico[]}
                      dataKey="porcentaje"
                      nameKey="segmento"
                      height={300}
                      tema={configuracionPersonalizada.temaGraficos === 'oscuro' ? 'oscuro' : 'claro'}
                    />
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Distribución Geográfica
                    </h3>
                    <GraficoBarras
                      data={clientesReporte.analisisGeografico as unknown as DatosGrafico[]}
                      dataKey="ventas"
                      xAxisKey="zona"
                      height={300}
                      tema={configuracionPersonalizada.temaGraficos === 'oscuro' ? 'oscuro' : 'claro'}
                    />
                  </div>
                </>
              )}

              {/* Gráficos de tendencias */}
              {tipoReporteActivo === 'tendencias' && tendenciasReporte && (
                <>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Crecimiento de Ventas
                    </h3>
                    <GraficoCombinado
                      data={tendenciasReporte.crecimientoVentas as unknown as DatosGrafico[]}
                      barDataKey="ventas"
                      lineDataKey="crecimiento"
                      xAxisKey="periodo"
                      height={300}
                      tema={configuracionPersonalizada.temaGraficos === 'oscuro' ? 'oscuro' : 'claro'}
                    />
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Análisis de Estacionalidad
                    </h3>
                    <GraficoRadar
                      data={tendenciasReporte.estacionalidad.map(e => ({
                        metrica: e.mes,
                        valor: e.indice * 100
                      }))}
                      height={300}
                      tema={configuracionPersonalizada.temaGraficos === 'oscuro' ? 'oscuro' : 'claro'}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};