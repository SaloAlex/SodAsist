import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  Plus, 
  BarChart3, 
  Grid3X3,
  Search,
  Download,
  Upload,
  Edit,
  Trash2,
  RefreshCw,
  Truck
} from 'lucide-react';
import { 
  Producto, 
  CategoriaProducto,
  FiltrosProductos,
  PaginacionProductos,
  ResultadoPaginado,
  InventarioVehiculo
} from '../types';
import { ProductosService } from '../services/productosService';
import { FirebaseService } from '../services/firebaseService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { InventarioDashboard } from '../components/inventario/InventarioDashboard';
import { ProductoForm } from '../components/inventario/ProductoForm';
import { CategoriaManager } from '../components/inventario/CategoriaManager';
import { InventarioVehiculoFormDinamico } from '../components/inventario/InventarioVehiculoFormDinamico';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  useProductosPaginados,
  useCategorias, 
  useCrearProducto, 
  useActualizarProducto, 
  useEliminarProducto
} from '../hooks/useProductosQuery';
import { Pagination } from '../components/common/Pagination';
import clsx from 'clsx';

type VistaInventario = 'dashboard' | 'productos' | 'movimientos' | 'categorias' | 'vehiculo';


interface ProductoTableProps {
  productos: Producto[];
  onEdit: (producto: Producto) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
  categorias: CategoriaProducto[];
}

const ProductoTable: React.FC<ProductoTableProps> = ({ productos, onEdit, onDelete, loading, categorias }) => {
  // Función para obtener el nombre de la categoría por ID
  const obtenerNombreCategoria = (categoriaId: string): string => {
    const categoria = categorias.find(cat => cat.id === categoriaId);
    return categoria ? categoria.nombre : categoriaId; // Fallback al ID si no se encuentra
  };

  if (productos.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No hay productos
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Comienza agregando tu primer producto al inventario
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Vista de tabla para desktop */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Precio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              {productos.map((producto) => (
                <tr key={producto.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-gray-400 dark:text-gray-300 mr-3 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {producto.nombre}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {producto.codigo}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {obtenerNombreCategoria(producto.categoria)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={clsx(
                        'text-sm font-medium',
                        producto.stock <= producto.stockMinimo
                          ? 'text-red-600 dark:text-red-400'
                          : producto.stock <= producto.stockMinimo * 2
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-green-600 dark:text-green-400'
                      )}>
                        {producto.stock}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                        / {producto.stockMinimo} mín
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    ${producto.precioVenta}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={clsx(
                      'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                      producto.activo
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    )}>
                      {producto.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onEdit(producto)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                        disabled={loading}
                        title="Editar producto"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(producto.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                        disabled={loading}
                        title="Eliminar producto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vista de cards para móvil */}
      <div className="md:hidden space-y-3">
        {productos.map((producto) => (
          <div 
            key={producto.id} 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Header del card */}
            <div className="p-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {producto.nombre}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {producto.codigo}
                    </p>
                  </div>
                </div>
                
                {/* Estado */}
                <span className={clsx(
                  'px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0',
                  producto.activo
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                )}>
                  {producto.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>

            {/* Información del producto */}
            <div className="p-3">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Categoría</p>
                  <p className="text-sm text-gray-900 dark:text-white truncate">{obtenerNombreCategoria(producto.categoria)}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Precio</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">${producto.precioVenta}</p>
                </div>
              </div>

              {/* Stock */}
              <div className="mb-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Stock</p>
                <div className="flex items-center">
                  <span className={clsx(
                    'text-sm font-medium',
                    producto.stock <= producto.stockMinimo
                      ? 'text-red-600 dark:text-red-400'
                      : producto.stock <= producto.stockMinimo * 2
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-green-600 dark:text-green-400'
                  )}>
                    {producto.stock}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                    / {producto.stockMinimo} mín
                  </span>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => onEdit(producto)}
                  className="flex items-center space-x-1 px-2 py-1.5 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                  disabled={loading}
                >
                  <Edit className="h-3 w-3" />
                  <span className="text-xs">Editar</span>
                </button>
                <button
                  onClick={() => onDelete(producto.id)}
                  className="flex items-center space-x-1 px-2 py-1.5 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  disabled={loading}
                >
                  <Trash2 className="h-3 w-3" />
                  <span className="text-xs">Eliminar</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export const Inventario: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Estados principales
  const [vistaActual, setVistaActual] = useState<VistaInventario>('dashboard');
  const [procesando, setProcesando] = useState(false);
  
  // Estados para formularios y modales
  const [mostrandoFormProducto, setMostrandoFormProducto] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | undefined>();
  const [mostrandoCategorias, setMostrandoCategorias] = useState(false);
  const [, setInventarioVehiculo] = useState<InventarioVehiculo | null>(null);
  
  // Estados para filtros
  const [filtros, setFiltros] = useState<FiltrosProductos>({});
  const [busqueda, setBusqueda] = useState('');
  
  // Estados para paginación
  const [paginacion, setPaginacion] = useState<PaginacionProductos>({
    pagina: 1,
    limite: 20,
    ordenarPor: 'nombre',
    orden: 'asc'
  });

  // React Query hooks
  const filtrosCompletos = { ...filtros, busqueda: busqueda.trim() || undefined };
  const { 
    data: resultadoPaginado,
    isLoading: loadingProductos, 
    error: errorProductos,
    refetch: refetchProductos 
  } = useProductosPaginados(filtrosCompletos, paginacion);
  
  // Extraer datos de la respuesta paginada
  const productos = (resultadoPaginado as ResultadoPaginado<Producto> | undefined)?.datos || [];
  const infoPaginacion = (resultadoPaginado as ResultadoPaginado<Producto> | undefined)?.paginacion;
  
  const { 
    data: categorias = [], 
    isLoading: loadingCategorias, 
    error: errorCategorias,
    refetch: refetchCategorias 
  } = useCategorias();

  // Mutations
  const crearProductoMutation = useCrearProducto();
  const actualizarProductoMutation = useActualizarProducto();
  const eliminarProductoMutation = useEliminarProducto();
  // Prefetch disponible para optimizaciones futuras
  // const { prefetchProductos, prefetchCategorias } = usePrefetchProductos();

  // Estados derivados
  const loading = loadingProductos || loadingCategorias;
  const error = errorProductos || errorCategorias;

  // Cargar inventario del vehículo
  const loadInventarioVehiculo = async () => {
    try {
      const inventario = await FirebaseService.getInventarioActual();
      setInventarioVehiculo(inventario);
    } catch (error) {
      console.error('Error al cargar inventario del vehículo:', error);
    }
  };

  // Cargar inventario del vehículo al montar el componente
  useEffect(() => {
    loadInventarioVehiculo();
  }, []);

  // Manejar parámetro de URL para ir directamente a la pestaña del vehículo
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'vehiculo') {
      setVistaActual('vehiculo');
    }
  }, [searchParams]);

  // Manejar guardado del inventario del vehículo
  const handleInventarioVehiculoSave = (inventario: Record<string, number>) => {
    // Convertir el inventario dinámico al formato esperado
    const inventarioVehiculo: InventarioVehiculo = {
      id: 'actual',
      fecha: new Date(),
      sodas: inventario['sodas'] || 0,
      bidones10: inventario['bidones10'] || 0,
      bidones20: inventario['bidones20'] || 0,
      envasesDevueltos: inventario['envasesDevueltos'] || 0,
      updatedAt: new Date()
    };
    setInventarioVehiculo(inventarioVehiculo);
    toast.success('Inventario del vehículo cargado correctamente');
  };

  // Verificar autenticación
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  // Función para reintentar carga en caso de error
  const reintentarCarga = useCallback(() => {
    refetchProductos();
    refetchCategorias();
  }, [refetchProductos, refetchCategorias]);

  // Funciones para manejar paginación
  const handlePageChange = useCallback((nuevaPagina: number) => {
    setPaginacion(prev => ({ ...prev, pagina: nuevaPagina }));
  }, []);

  const handleLimitChange = useCallback((nuevoLimite: number) => {
    setPaginacion(prev => ({ ...prev, limite: nuevoLimite, pagina: 1 }));
  }, []);

  const handleSortChange = useCallback((ordenarPor: string, orden: 'asc' | 'desc') => {
    setPaginacion(prev => ({ 
      ...prev, 
      ordenarPor: ordenarPor as 'nombre' | 'precioVenta' | 'stock' | 'createdAt' | 'updatedAt', 
      orden, 
      pagina: 1 
    }));
  }, []);

  // Crear productos iniciales si no hay productos
  useEffect(() => {
    const crearProductosIniciales = async () => {
      if (productos.length === 0 && user && !loadingProductos && !errorProductos) {
        try {
          toast.loading('Creando productos iniciales...', { id: 'productos-iniciales' });
          await ProductosService.crearProductosIniciales(user.uid);
          refetchProductos();
          toast.success('Productos iniciales creados', { id: 'productos-iniciales' });
        } catch (error) {
          console.error('Error al crear productos iniciales:', error);
          toast.error('Error al crear productos iniciales', { id: 'productos-iniciales' });
        }
      }
    };

    crearProductosIniciales();
  }, [productos.length, user, loadingProductos, errorProductos, refetchProductos]);


  const handleCrearProducto = () => {
    setProductoEditando(undefined);
    setMostrandoFormProducto(true);
  };

  const handleEditarProducto = (producto: Producto) => {
    setProductoEditando(producto);
    setMostrandoFormProducto(true);
  };

  const handleGuardarProducto = async (data: Partial<Producto>) => {
    try {
      setProcesando(true);
      
      if (productoEditando) {
        // Actualizar producto existente
        await actualizarProductoMutation.mutateAsync({
          id: productoEditando.id,
          producto: {
            ...data,
            updatedBy: user!.uid
          }
        });
      } else {
        // Crear nuevo producto
        await crearProductoMutation.mutateAsync({
          ...data,
          createdBy: user!.uid,
          updatedBy: user!.uid
        } as Omit<Producto, 'id' | 'createdAt' | 'updatedAt'>);
      }

      setMostrandoFormProducto(false);
      setProductoEditando(undefined);
    } catch (error) {
      console.error('Error al guardar producto:', error);
      // El error ya se maneja en las mutations
    } finally {
      setProcesando(false);
    }
  };

  const handleEliminarProducto = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      return;
    }

    try {
      setProcesando(true);
      await eliminarProductoMutation.mutateAsync(id);
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      // El error ya se maneja en la mutation
    } finally {
      setProcesando(false);
    }
  };

  const renderNavegacion = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
      <div className="px-4 sm:px-6 py-4">
        <nav className="flex overflow-x-auto space-x-2 sm:space-x-8 scrollbar-hide">
          <button
            onClick={() => setVistaActual('dashboard')}
            className={clsx(
              'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
              vistaActual === 'dashboard'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            )}
          >
            <BarChart3 className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          
          <button
            onClick={() => setVistaActual('productos')}
            className={clsx(
              'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
              vistaActual === 'productos'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            )}
          >
            <Package className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Productos</span>
          </button>
          
          <button
            onClick={() => setVistaActual('vehiculo')}
            className={clsx(
              'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
              vistaActual === 'vehiculo'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            )}
          >
            <Truck className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Vehículo</span>
          </button>
          
          <button
            onClick={() => setVistaActual('movimientos')}
            className={clsx(
              'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
              vistaActual === 'movimientos'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            )}
          >
            <Upload className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Movimientos</span>
          </button>
          
          <button
            onClick={() => setMostrandoCategorias(true)}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors whitespace-nowrap"
          >
            <Grid3X3 className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Categorías</span>
          </button>
        </nav>
      </div>
    </div>
  );

  const renderBarraAcciones = () => {
    if (vistaActual !== 'productos' && vistaActual !== 'vehiculo') return null;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
            {vistaActual === 'productos' ? (
              <>
                {/* Barra de búsqueda */}
                <div className="flex-1 sm:max-w-lg">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Buscar productos..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Título para inventario del vehículo */}
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Gestión del Inventario del Vehículo
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Administra el stock que llevas en el camión
                  </p>
                </div>
              </>
            )}
            
            {/* Filtros y acciones */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
              {vistaActual === 'vehiculo' && (
                <button
                  onClick={loadInventarioVehiculo}
                  className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </button>
              )}
              <div className="relative">
                <select
                  value={filtros.categoria || ''}
                  onChange={(e) => setFiltros({ ...filtros, categoria: e.target.value || undefined })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm pr-8"
                  disabled={loadingCategorias}
                >
                  <option value="">
                    {loadingCategorias ? 'Cargando categorías...' : 'Todas las categorías'}
                  </option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
                {loadingCategorias && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              {/* Selector de ordenamiento */}
              <div className="flex items-center space-x-2">
                <select
                  value={`${paginacion.ordenarPor}-${paginacion.orden}`}
                  onChange={(e) => {
                    const [ordenarPor, orden] = e.target.value.split('-');
                    handleSortChange(ordenarPor, orden as 'asc' | 'desc');
                  }}
                  className="px-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm appearance-none bg-no-repeat bg-right bg-[length:16px] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQgNkw4IDEwTDEyIDYiIHN0cm9rZT0iIzM3NDE1MSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQgNkw4IDEwTDEyIDYiIHN0cm9rZT0iI0Y5RkFGQiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')]"
                >
                  <option value="nombre-asc">Nombre A-Z</option>
                  <option value="nombre-desc">Nombre Z-A</option>
                  <option value="precioVenta-asc">Precio Menor</option>
                  <option value="precioVenta-desc">Precio Mayor</option>
                  <option value="stock-asc">Stock Menor</option>
                  <option value="stock-desc">Stock Mayor</option>
                  <option value="createdAt-desc">Más Recientes</option>
                  <option value="createdAt-asc">Más Antiguos</option>
                </select>
              </div>
              
              <button
                onClick={handleCrearProducto}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || loadingCategorias}
              >
                <Plus className="h-4 w-4 flex-shrink-0" />
                <span className="whitespace-nowrap">Nuevo Producto</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContenido = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    // Mostrar error con opción de reintentar
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Error al cargar datos
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md">
              {error?.message || 'Error desconocido'}
            </p>
          </div>
          <button
            onClick={reintentarCarga}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Reintentar</span>
          </button>
        </div>
      );
    }

    switch (vistaActual) {
      case 'dashboard':
        return (
          <InventarioDashboard
            onVerProductos={() => setVistaActual('productos')}
            onVerMovimientos={() => setVistaActual('movimientos')}
          />
        );
      
      case 'productos':
        return (
          <div className="space-y-6">
            <ProductoTable
              productos={productos}
              onEdit={handleEditarProducto}
              onDelete={handleEliminarProducto}
              loading={procesando || loadingProductos}
              categorias={categorias}
            />
            
            {/* Componente de paginación */}
            {infoPaginacion && (
              <Pagination
                paginaActual={infoPaginacion.paginaActual}
                totalPaginas={infoPaginacion.totalPaginas}
                totalElementos={infoPaginacion.totalElementos}
                limite={infoPaginacion.limite}
                tieneSiguiente={infoPaginacion.tieneSiguiente}
                tieneAnterior={infoPaginacion.tieneAnterior}
                onPageChange={handlePageChange}
                onLimitChange={handleLimitChange}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
              />
            )}
          </div>
        );
      
      case 'movimientos':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-center py-12">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
                Movimientos de Inventario
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Esta funcionalidad estará disponible próximamente
              </p>
            </div>
          </div>
        );
      
      case 'vehiculo':
        return (
          <InventarioVehiculoFormDinamico
            onSave={handleInventarioVehiculoSave}
            onCancel={() => setVistaActual('dashboard')}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-0">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
            Sistema de Inventario
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Gestión completa de productos y stock
          </p>
        </div>
        
        <div className="flex items-center justify-end sm:justify-start space-x-3">
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-2 px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
          >
            <Download className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </div>

      {/* Navegación */}
      {renderNavegacion()}
      
      {/* Barra de acciones */}
      {renderBarraAcciones()}
      
      {/* Contenido principal */}
      {renderContenido()}

      {/* Modales */}
      {mostrandoFormProducto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <ProductoForm
              producto={productoEditando}
              onSubmit={handleGuardarProducto}
              onCancel={() => {
                setMostrandoFormProducto(false);
                setProductoEditando(undefined);
              }}
              isLoading={procesando}
            />
          </div>
        </div>
      )}

      {mostrandoCategorias && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CategoriaManager
              onClose={() => {
                setMostrandoCategorias(false);
                refetchCategorias(); // Recargar categorías después de gestionar categorías
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};