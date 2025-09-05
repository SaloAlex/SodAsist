import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  TrendingUp, 
  RefreshCw,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  Plus,
  Minus,
  Edit
} from 'lucide-react';
import { 
  MovimientoInventario, 
  TipoMovimiento, 
  FiltrosMovimientos,
  Producto 
} from '../../types';
import { InventarioService } from '../../services/inventarioService';
import { ProductosService } from '../../services/productosService';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Pagination } from '../common/Pagination';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MovimientosInventarioProps {
  onClose?: () => void;
}

const TIPOS_MOVIMIENTO = {
  [TipoMovimiento.ENTRADA]: { 
    label: 'Entrada', 
    color: 'text-green-600 dark:text-green-400', 
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    icon: ArrowUpRight 
  },
  [TipoMovimiento.SALIDA]: { 
    label: 'Salida', 
    color: 'text-red-600 dark:text-red-400', 
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    icon: ArrowDownLeft 
  },
  [TipoMovimiento.AJUSTE]: { 
    label: 'Ajuste', 
    color: 'text-blue-600 dark:text-blue-400', 
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    icon: Edit 
  },
  [TipoMovimiento.VENTA]: { 
    label: 'Venta', 
    color: 'text-purple-600 dark:text-purple-400', 
    bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    icon: TrendingUp 
  },
  [TipoMovimiento.DEVOLUCION]: { 
    label: 'Devolución', 
    color: 'text-orange-600 dark:text-orange-400', 
    bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    icon: RotateCcw 
  },
  [TipoMovimiento.MERMA]: { 
    label: 'Merma', 
    color: 'text-gray-600 dark:text-gray-400', 
    bgColor: 'bg-gray-100 dark:bg-gray-900/20',
    icon: Minus 
  },
  [TipoMovimiento.TRANSFERENCIA]: { 
    label: 'Transferencia', 
    color: 'text-indigo-600 dark:text-indigo-400', 
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/20',
    icon: RefreshCw 
  },
  [TipoMovimiento.INICIAL]: { 
    label: 'Inicial', 
    color: 'text-cyan-600 dark:text-cyan-400', 
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/20',
    icon: Plus 
  }
};

export const MovimientosInventario: React.FC<MovimientosInventarioProps> = () => {
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosMovimientos>({});
  const [busqueda, setBusqueda] = useState(''); // Para uso futuro
  // Evitar warning de variable no utilizada
  void busqueda;
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const LIMITE_POR_PAGINA = 20;

  // Cargar productos para el filtro
  const loadProductos = useCallback(async () => {
    try {
      const productosData = await ProductosService.getProductos({ activo: true });
      setProductos(productosData);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  }, []);

  // Cargar movimientos
  const loadMovimientos = useCallback(async () => {
    try {
      setLoading(true);
      const movimientosData = await InventarioService.getMovimientos(filtros, LIMITE_POR_PAGINA);
      setMovimientos(movimientosData);
      setTotalPaginas(Math.ceil(movimientosData.length / LIMITE_POR_PAGINA));
    } catch (error) {
      console.error('Error al cargar movimientos:', error);
      toast.error('Error al cargar movimientos');
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  // Refrescar movimientos
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMovimientos();
    setRefreshing(false);
  }, [loadMovimientos]);

  // Aplicar filtros
  const handleAplicarFiltros = useCallback(() => {
    setPagina(1);
    loadMovimientos();
  }, [loadMovimientos]);

  // Limpiar filtros
  const handleLimpiarFiltros = useCallback(() => {
    setFiltros({});
    setBusqueda('');
    setPagina(1);
  }, []);

  // Obtener nombre del producto
  const getNombreProducto = useCallback((productoId: string): string => {
    const producto = productos.find(p => p.id === productoId);
    return producto?.nombre || 'Producto no encontrado';
  }, [productos]);

  // Obtener información del tipo de movimiento
  const getTipoInfo = useCallback((tipo: TipoMovimiento) => {
    return TIPOS_MOVIMIENTO[tipo] || TIPOS_MOVIMIENTO[TipoMovimiento.AJUSTE];
  }, []);

  // Formatear fecha
  const formatearFecha = useCallback((fecha: Date): string => {
    return format(fecha, 'dd/MM/yyyy HH:mm', { locale: es });
  }, []);

  useEffect(() => {
    loadProductos();
  }, [loadProductos]);

  useEffect(() => {
    loadMovimientos();
  }, [loadMovimientos]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Movimientos de Inventario
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Historial completo de transacciones de inventario
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Filtros */}
      {mostrarFiltros && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Producto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Producto
              </label>
              <select
                value={filtros.productoId || ''}
                onChange={(e) => setFiltros(prev => ({ ...prev, productoId: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="">Todos los productos</option>
                {productos.map(producto => (
                  <option key={producto.id} value={producto.id}>
                    {producto.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo de movimiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo
              </label>
              <select
                value={filtros.tipo || ''}
                onChange={(e) => setFiltros(prev => ({ ...prev, tipo: e.target.value as TipoMovimiento || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="">Todos los tipos</option>
                {Object.entries(TIPOS_MOVIMIENTO).map(([tipo, info]) => (
                  <option key={tipo} value={tipo}>
                    {info.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha desde */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fecha desde
              </label>
              <input
                type="date"
                value={filtros.fechaDesde ? format(filtros.fechaDesde, 'yyyy-MM-dd') : ''}
                onChange={(e) => setFiltros(prev => ({ 
                  ...prev, 
                  fechaDesde: e.target.value ? new Date(e.target.value) : undefined 
                }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>

            {/* Fecha hasta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fecha hasta
              </label>
              <input
                type="date"
                value={filtros.fechaHasta ? format(filtros.fechaHasta, 'yyyy-MM-dd') : ''}
                onChange={(e) => setFiltros(prev => ({ 
                  ...prev, 
                  fechaHasta: e.target.value ? new Date(e.target.value) : undefined 
                }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
          </div>

          {/* Botones de filtros */}
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={handleLimpiarFiltros}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Limpiar
            </button>
            <button
              onClick={handleAplicarFiltros}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      )}

      {/* Lista de movimientos */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Cargando movimientos...</span>
          </div>
        ) : movimientos.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
              No hay movimientos
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              No se encontraron movimientos con los filtros aplicados
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Motivo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Usuario
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {movimientos.map((movimiento) => {
                  const tipoInfo = getTipoInfo(movimiento.tipo);
                  const IconComponent = tipoInfo.icon;
                  
                  return (
                    <tr key={movimiento.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatearFecha(movimiento.fecha)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {getNombreProducto(movimiento.productoId)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tipoInfo.bgColor} ${tipoInfo.color}`}>
                          <IconComponent className="h-3 w-3 mr-1" />
                          {tipoInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <span className={`font-medium ${movimiento.cantidad > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {movimiento.cantidad > 0 ? '+' : ''}{movimiento.cantidad}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {movimiento.cantidadAnterior} → {movimiento.cantidadNueva}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {movimiento.motivo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {movimiento.usuario}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {movimientos.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <Pagination
              paginaActual={pagina}
              totalPaginas={totalPaginas}
              totalElementos={movimientos.length}
              limite={LIMITE_POR_PAGINA}
              tieneSiguiente={pagina < totalPaginas}
              tieneAnterior={pagina > 1}
              onPageChange={setPagina}
            />
          </div>
        )}
      </div>
    </div>
  );
};
