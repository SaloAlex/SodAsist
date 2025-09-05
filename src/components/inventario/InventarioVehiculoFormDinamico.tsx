import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { 
  Truck, 
  Save, 
  X, 
  Package,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Producto } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { ProductosService } from '../../services/productosService';
import toast from 'react-hot-toast';
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';

// Schema dinámico basado en productos disponibles
const createSchema = (productos: Producto[]) => {
  const schemaFields: Record<string, yup.AnySchema> = {};
  
  productos.forEach(producto => {
    schemaFields[`producto_${producto.id}`] = yup.number()
      .min(0, 'Mínimo 0')
      .max(producto.stock || 999, `Máximo ${producto.stock || 0} disponibles en depósito`)
      .required('Cantidad requerida');
  });
  
  return yup.object().shape(schemaFields);
};

type InventarioVehiculoFormData = {
  [key: string]: number;
};

interface InventarioVehiculoFormDinamicoProps {
  onSave?: (inventario: Record<string, number>) => void;
  onCancel?: () => void;
}

export const InventarioVehiculoFormDinamico: React.FC<InventarioVehiculoFormDinamicoProps> = ({
  onSave,
  onCancel
}) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [inventarioActual, setInventarioActual] = useState<Record<string, number>>({});
  const [loadingInventario, setLoadingInventario] = useState(true);

  // Cargar inventario actual del vehículo
  const loadInventarioActual = useCallback(async () => {
    try {
      setLoadingInventario(true);
      if (!user?.email) return;
      
      const inventarioRef = doc(db, `tenants/${user.email}/inventarioVehiculo`, 'actual');
      const inventarioDoc = await getDoc(inventarioRef);
      
      if (inventarioDoc.exists()) {
        const data = inventarioDoc.data();
        const inventario: Record<string, number> = {};
        
        // Mapear los datos del inventario
        if (data) {
          Object.keys(data).forEach(key => {
            if (key !== 'updatedAt' && key !== 'fecha' && typeof data[key] === 'number') {
              inventario[key] = data[key];
            }
          });
        }
        
        setInventarioActual(inventario);
      } else {
        setInventarioActual({});
      }
    } catch (error) {
      console.error('Error al cargar inventario actual:', error);
      setInventarioActual({});
    } finally {
      setLoadingInventario(false);
    }
  }, [user?.email]);

  // Cargar productos disponibles
  const loadProductos = useCallback(async () => {
    try {
      setLoadingProductos(true);
      const productosData = await ProductosService.getProductos({ activo: true });
      
      // Filtrar productos duplicados - agrupar por nombre y tomar el que tenga mayor stock
      const productosUnicos = productosData.reduce((acc, producto) => {
        const nombreNormalizado = producto.nombre.toLowerCase().trim();
        
        if (!acc[nombreNormalizado]) {
          acc[nombreNormalizado] = producto;
        } else {
          // Si ya existe, tomar el que tenga mayor stock
          if (producto.stock > acc[nombreNormalizado].stock) {
            acc[nombreNormalizado] = producto;
          }
        }
        
        return acc;
      }, {} as Record<string, Producto>);
      
      const productosFiltrados = Object.values(productosUnicos);
      setProductos(productosFiltrados);
    } catch (err) {
      console.error('Error al cargar productos:', err);
      toast.error('Error al cargar productos');
      setProductos([]);
    } finally {
      setLoadingProductos(false);
    }
  }, []);

  useEffect(() => {
    loadProductos();
    loadInventarioActual();
  }, [loadProductos, loadInventarioActual]);

  // Crear valores por defecto basados en productos
  const defaultValues = productos.reduce((acc, producto) => {
    acc[`producto_${producto.id}`] = 0;
    return acc;
  }, {} as Record<string, number>);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm<InventarioVehiculoFormData>({
    resolver: yupResolver(createSchema(productos)),
    defaultValues
  });

  const watchedValues = watch();

  // Calcular total de productos cargados
  const totalProductos = Object.values(watchedValues).reduce((sum, cantidad) => sum + (cantidad || 0), 0);

  const onSubmit = async (data: InventarioVehiculoFormData) => {
    if (!user?.email) {
      toast.error('Usuario no autenticado');
      return;
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);
      const userTenantId = user.email;
      
      // 1. Actualizar inventario del vehículo
      const inventarioVehiculoData: Record<string, number> = {};
      productos.forEach(producto => {
        const cantidad = data[`producto_${producto.id}`] || 0;
        inventarioVehiculoData[producto.id] = cantidad;
      });

      const inventarioRef = doc(db, `tenants/${userTenantId}/inventarioVehiculo`, 'actual');
      batch.set(inventarioRef, {
        ...inventarioVehiculoData,
        updatedAt: serverTimestamp(),
        fecha: serverTimestamp()
      });

      // 2. Descontar del inventario del depósito
      productos.forEach(producto => {
        const cantidadCargada = data[`producto_${producto.id}`] || 0;
        if (cantidadCargada > 0) {
          const productoRef = doc(db, `tenants/${userTenantId}/productos`, producto.id);
          const nuevoStock = Math.max(0, producto.stock - cantidadCargada);
          console.log(`Descontando ${cantidadCargada} de ${producto.nombre}: ${producto.stock} -> ${nuevoStock}`);
          batch.update(productoRef, {
            stock: nuevoStock,
            updatedAt: serverTimestamp()
          });
        }
      });

      await batch.commit();

      toast.success('Inventario del vehículo cargado correctamente');
      onSave?.(inventarioVehiculoData);
      reset();
      
      // Recargar el inventario actual para mostrar los cambios
      await loadInventarioActual();
      
    } catch (error) {
      console.error('Error al cargar inventario:', error);
      toast.error('Error al cargar inventario del vehículo');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
  };

  if (loadingProductos) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Cargando productos...</span>
      </div>
    );
  }

  if (productos.length === 0) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              No hay productos disponibles
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              Primero debes crear productos en el inventario de depósito.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Inventario Actual del Vehículo */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Truck className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Inventario Actual del Vehículo
              </h3>
            </div>
            <button
              onClick={loadInventarioActual}
              disabled={loadingInventario}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loadingInventario ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {loadingInventario ? (
            <div className="flex items-center justify-center py-4">
              <LoadingSpinner size="sm" />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Cargando inventario...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {productos.map((producto) => {
                const cantidadActual = inventarioActual[producto.id] || 0;
                return (
                  <div key={producto.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Package className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                            {producto.nombre}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Stock disponible: {producto.stock}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                          {cantidadActual}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">en vehículo</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Formulario de Carga */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Truck className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Cargar Inventario del Vehículo
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Selecciona las cantidades a cargar desde el depósito
                </p>
              </div>
            </div>
            <button
              onClick={loadProductos}
              disabled={loadingProductos}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loadingProductos ? 'animate-spin' : ''}`} />
            </button>
          </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {productos.map((producto) => (
              <div key={producto.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <Package className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                        {producto.nombre}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Stock disponible: {producto.stock}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Cantidad a cargar
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={producto.stock}
                    {...register(`producto_${producto.id}`)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                    placeholder="0"
                  />
                  {errors[`producto_${producto.id}`] && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {errors[`producto_${producto.id}`]?.message}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Resumen */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Total de productos a cargar:
              </span>
              <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                {totalProductos}
              </span>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <X className="h-4 w-4 mr-2 inline" />
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || totalProductos === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2 inline" />
                  Cargar Inventario
                </>
              )}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};
