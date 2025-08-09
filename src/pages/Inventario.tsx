import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  BarChart3, 
  Grid3X3,
  Search,
  Download,
  Upload,
  Edit,
  Trash2
} from 'lucide-react';
import { 
  Producto, 
  CategoriaProducto, 
  FiltrosProductos 
} from '../types';
import { ProductosService } from '../services/productosService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { InventarioDashboard } from '../components/inventario/InventarioDashboard';
import { ProductoForm } from '../components/inventario/ProductoForm';
import { CategoriaManager } from '../components/inventario/CategoriaManager';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

type VistaInventario = 'dashboard' | 'productos' | 'movimientos' | 'categorias';

interface ProductoTableProps {
  productos: Producto[];
  onEdit: (producto: Producto) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

const ProductoTable: React.FC<ProductoTableProps> = ({ productos, onEdit, onDelete, loading }) => {
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
                      <Package className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
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
                    {producto.categoria}
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
      <div className="md:hidden space-y-4">
        {productos.map((producto) => (
          <div 
            key={producto.id} 
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700"
          >
            {/* Header del card */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <Package className="h-5 w-5 text-gray-400 flex-shrink-0" />
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

            {/* Información del producto */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Categoría</p>
                <p className="text-sm text-gray-900 dark:text-white">{producto.categoria}</p>
              </div>
              
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Precio</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">${producto.precioVenta}</p>
              </div>
            </div>

            {/* Stock */}
            <div className="mb-4">
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
                  / {producto.stockMinimo} mínimo
                </span>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => onEdit(producto)}
                className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                disabled={loading}
              >
                <Edit className="h-4 w-4" />
                <span className="text-sm">Editar</span>
              </button>
              <button
                onClick={() => onDelete(producto.id)}
                className="flex items-center space-x-2 px-3 py-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                disabled={loading}
              >
                <Trash2 className="h-4 w-4" />
                <span className="text-sm">Eliminar</span>
              </button>
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
  
  // Estados principales
  const [vistaActual, setVistaActual] = useState<VistaInventario>('dashboard');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaProducto[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  
  // Estados para formularios y modales
  const [mostrandoFormProducto, setMostrandoFormProducto] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | undefined>();
  const [mostrandoCategorias, setMostrandoCategorias] = useState(false);
  
  // Estados para filtros
  const [filtros, setFiltros] = useState<FiltrosProductos>({});
  const [busqueda, setBusqueda] = useState('');

  // Verificar autenticación
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [productosData, categoriasDataRaw] = await Promise.all([
        ProductosService.getProductos(filtros),
        ProductosService.getCategorias()
      ]);
      
      // Filtrar categorías duplicadas (mantener la más reciente)
      const categoriasUnicas = categoriasDataRaw.reduce((acc, categoria) => {
        const existente = acc.find(cat => cat.nombre.toLowerCase() === categoria.nombre.toLowerCase());
        if (!existente) {
          acc.push(categoria);
        } else if (categoria.updatedAt > existente.updatedAt) {
          // Reemplazar con la más reciente
          const index = acc.indexOf(existente);
          acc[index] = categoria;
        }
        return acc;
      }, [] as CategoriaProducto[]);
      
      setProductos(productosData);
      setCategorias(categoriasUnicas);
      
      // Si no hay productos, crear productos iniciales
      if (productosData.length === 0 && user) {
        await ProductosService.crearProductosIniciales(user.uid);
        const nuevosProductos = await ProductosService.getProductos();
        setProductos(nuevosProductos);
        toast.success('Productos iniciales creados');
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar datos del inventario');
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtros cuando cambien
  useEffect(() => {
    const aplicarFiltros = async () => {
      try {
        setLoading(true);
        const filtrosCompletos = {
          ...filtros,
          busqueda: busqueda.trim() || undefined
        };
        const productosData = await ProductosService.getProductos(filtrosCompletos);
        setProductos(productosData);
      } catch (error) {
        console.error('Error al aplicar filtros:', error);
        toast.error('Error al filtrar productos');
      } finally {
        setLoading(false);
      }
    };

    const debounceTimeout = setTimeout(aplicarFiltros, 300);
    return () => clearTimeout(debounceTimeout);
  }, [filtros, busqueda]);

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
        await ProductosService.actualizarProducto(productoEditando.id, {
          ...data,
          updatedBy: user!.uid
        });
        toast.success('Producto actualizado correctamente');
      } else {
        // Crear nuevo producto
        await ProductosService.crearProducto({
          ...data,
          createdBy: user!.uid,
          updatedBy: user!.uid
        } as Omit<Producto, 'id' | 'createdAt' | 'updatedAt'>);
        toast.success('Producto creado correctamente');
      }

      await cargarDatos();
      setMostrandoFormProducto(false);
      setProductoEditando(undefined);
    } catch (error) {
      console.error('Error al guardar producto:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar producto');
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
      await ProductosService.eliminarProducto(id);
      toast.success('Producto eliminado correctamente');
      await cargarDatos();
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      toast.error('Error al eliminar producto');
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
    if (vistaActual !== 'productos') return null;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
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
            
            {/* Filtros y acciones */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
              <select
                value={filtros.categoria || ''}
                onChange={(e) => setFiltros({ ...filtros, categoria: e.target.value || undefined })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="">Todas las categorías</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
              
              <button
                onClick={handleCrearProducto}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                disabled={loading}
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
          <ProductoTable
            productos={productos}
            onEdit={handleEditarProducto}
            onDelete={handleEliminarProducto}
            loading={procesando}
          />
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
                cargarDatos(); // Recargar datos después de gestionar categorías
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};