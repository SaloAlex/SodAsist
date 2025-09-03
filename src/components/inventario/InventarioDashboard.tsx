import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign,
  BarChart3,
  Eye,
  RefreshCw,
  Calendar,
  Filter
} from 'lucide-react';
import { 
  MetricasInventario,
  ReporteInventario,
  Producto
} from '../../types';
import { InventarioService } from '../../services/inventarioService';
import { ProductosService } from '../../services/productosService';
import { PreciosService } from '../../services/preciosService';
import { LoadingSpinner } from '../common/LoadingSpinner';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface InventarioDashboardProps {
  onVerProductos: () => void;
  onVerMovimientos: () => void;
}

interface MetricCard {
  titulo: string;
  valor: string | number;
  icono: React.ReactNode;
  color: string;
  tendencia?: {
    valor: number;
    esPositiva: boolean;
  };
  onClick?: () => void;
}

export const InventarioDashboard: React.FC<InventarioDashboardProps> = ({
  onVerProductos,
  onVerMovimientos
}) => {
  const [metricas, setMetricas] = useState<MetricasInventario | null>(null);
  const [reporte, setReporte] = useState<ReporteInventario | null>(null);
  const [productosStockBajo, setProductosStockBajo] = useState<Producto[]>([]);
  const [productosAgotados, setProductosAgotados] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      
      // Cargar datos en paralelo
      const [
        metricasData,
        reporteData,
        productosStockBajoData,
        productosAgotadosData
      ] = await Promise.all([
        InventarioService.getMetricasInventario(),
        InventarioService.generarReporteInventario(fechaSeleccionada),
        ProductosService.getProductosStockBajo(),
        ProductosService.getProductosAgotados()
      ]);

      setMetricas(metricasData);
      setReporte(reporteData);
      setProductosStockBajo(productosStockBajoData);
      setProductosAgotados(productosAgotadosData);
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
      toast.error('Error al cargar datos del inventario');
    } finally {
      setLoading(false);
    }
  }, [fechaSeleccionada]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const actualizarDatos = async () => {
    setActualizando(true);
    await cargarDatos();
    setActualizando(false);
    toast.success('Datos actualizados');
  };

  const formatearPrecio = (precio: number): string => {
    return PreciosService.formatearPrecio(precio);
  };

  const tarjetasMetricas: MetricCard[] = metricas ? [
    {
      titulo: 'Valor Total Inventario',
      valor: formatearPrecio(metricas.valorTotal),
      icono: <DollarSign className="h-6 w-6" />,
      color: 'bg-green-500',
      onClick: onVerProductos
    },
    {
      titulo: 'Total Productos',
      valor: metricas.cantidadProductos,
      icono: <Package className="h-6 w-6" />,
      color: 'bg-blue-500',
      onClick: onVerProductos
    },
    {
      titulo: 'Productos Activos',
      valor: metricas.productosActivos,
      icono: <TrendingUp className="h-6 w-6" />,
      color: 'bg-emerald-500'
    },
    {
      titulo: 'Stock Bajo',
      valor: metricas.productosConStockBajo,
      icono: <AlertTriangle className="h-6 w-6" />,
      color: 'bg-amber-500',
      tendencia: metricas.productosConStockBajo > 0 ? {
        valor: metricas.productosConStockBajo,
        esPositiva: false
      } : undefined
    },
    {
      titulo: 'Productos Agotados',
      valor: metricas.productosAgotados,
      icono: <TrendingDown className="h-6 w-6" />,
      color: 'bg-red-500',
      tendencia: metricas.productosAgotados > 0 ? {
        valor: metricas.productosAgotados,
        esPositiva: false
      } : undefined
    },
    {
      titulo: 'Movimientos Hoy',
      valor: metricas.movimientosHoy,
      icono: <BarChart3 className="h-6 w-6" />,
      color: 'bg-purple-500',
      onClick: onVerMovimientos
    },
    {
      titulo: 'Ventas Hoy',
      valor: metricas.ventasHoy,
      icono: <TrendingUp className="h-6 w-6" />,
      color: 'bg-indigo-500'
    },
    {
      titulo: 'Categorías',
      valor: metricas.categorias,
      icono: <Filter className="h-6 w-6" />,
      color: 'bg-teal-500'
    }
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard de Inventario
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Resumen general del estado del inventario
          </p>
        </div>
        
        <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <input
              type="date"
              value={fechaSeleccionada.toISOString().split('T')[0]}
              onChange={(e) => setFechaSeleccionada(new Date(e.target.value))}
              className="flex-1 sm:flex-none px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <button
            onClick={actualizarDatos}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
            disabled={actualizando}
          >
            <RefreshCw className={clsx('h-4 w-4 flex-shrink-0', actualizando && 'animate-spin')} />
            <span className="whitespace-nowrap">
              {actualizando ? 'Actualizando...' : 'Actualizar'}
            </span>
          </button>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tarjetasMetricas.map((tarjeta, index) => (
          <div
            key={index}
            className={clsx(
              'bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-all',
              tarjeta.onClick && 'cursor-pointer hover:shadow-md'
            )}
            onClick={tarjeta.onClick}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {tarjeta.titulo}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {tarjeta.valor}
                </p>
                {tarjeta.tendencia && (
                  <div className="flex items-center mt-2">
                    {tarjeta.tendencia.esPositiva ? (
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={clsx(
                      'text-sm',
                      tarjeta.tendencia.esPositiva ? 'text-green-600' : 'text-red-600'
                    )}>
                      {tarjeta.tendencia.valor} productos
                    </span>
                  </div>
                )}
              </div>
              <div className={clsx('p-3 rounded-full text-white', tarjeta.color)}>
                {tarjeta.icono}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alertas y Productos Críticos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productos con Stock Bajo */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Stock Bajo
                </h3>
                <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {productosStockBajo.length}
                </span>
              </div>
              <button
                onClick={onVerProductos}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Ver todos
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {productosStockBajo.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay productos con stock bajo</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {productosStockBajo.slice(0, 5).map(producto => (
                  <div key={producto.id} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                        {producto.nombre}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Stock actual: {producto.stock} | Mínimo: {producto.stockMinimo}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                        {producto.stock}
                      </span>
                    </div>
                  </div>
                ))}
                {productosStockBajo.length > 5 && (
                  <button
                    onClick={onVerProductos}
                    className="w-full text-center text-blue-600 hover:text-blue-700 text-sm font-medium py-2"
                  >
                    Ver {productosStockBajo.length - 5} más...
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Productos Agotados */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Productos Agotados
                </h3>
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {productosAgotados.length}
                </span>
              </div>
              <button
                onClick={onVerProductos}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Ver todos
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {productosAgotados.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay productos agotados</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {productosAgotados.slice(0, 5).map(producto => (
                  <div key={producto.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                        {producto.nombre}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Precio: {formatearPrecio(producto.precioVenta)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                        Agotado
                      </span>
                    </div>
                  </div>
                ))}
                {productosAgotados.length > 5 && (
                  <button
                    onClick={onVerProductos}
                    className="w-full text-center text-blue-600 hover:text-blue-700 text-sm font-medium py-2"
                  >
                    Ver {productosAgotados.length - 5} más...
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resumen del Reporte */}
      {reporte && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Actividad del Día
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {reporte.fecha.toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {reporte.movimientosDelDia}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Movimientos
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {reporte.ventasDelDia}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ventas
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {reporte.comprasDelDia}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Compras
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatearPrecio(reporte.valorTotalInventario)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Valor Total
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Acciones Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={onVerProductos}
          className="flex items-center justify-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <Package className="h-5 w-5" />
          <span className="font-medium">Ver Productos</span>
        </button>
        
        <button
          onClick={onVerMovimientos}
          className="flex items-center justify-center space-x-3 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
        >
          <BarChart3 className="h-5 w-5" />
          <span className="font-medium">Ver Movimientos</span>
        </button>
        
        <button
          onClick={() => window.print()}
          className="flex items-center justify-center space-x-3 p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
        >
          <Eye className="h-5 w-5" />
          <span className="font-medium">Imprimir Reporte</span>
        </button>
      </div>
    </div>
  );
};
