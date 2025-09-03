import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { 
  Package, 
  Save, 
  X, 
  Calculator, 
  Barcode, 
  Eye,
  EyeOff,
  Info
} from 'lucide-react';
import { 
  Producto, 
  CategoriaProducto, 
  UnidadMedida
} from '../../types';
import { ProductosService } from '../../services/productosService';
import { PreciosService } from '../../services/preciosService';
import { LoadingSpinner } from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

const schema = yup.object().shape({
  nombre: yup.string().required('Nombre requerido').min(2, 'Mínimo 2 caracteres'),
  descripcion: yup.string(),
  categoria: yup.string().required('Categoría requerida'),
  codigo: yup.string(),
  codigoBarras: yup.string(),
  unidadMedida: yup.string().required('Unidad de medida requerida'),
  precioCompra: yup.number().min(0, 'Precio debe ser positivo').required('Precio de compra requerido'),
  precioVenta: yup.number().min(0, 'Precio debe ser positivo').required('Precio de venta requerido'),
  stock: yup.number().min(0, 'Stock debe ser positivo').required('Stock inicial requerido'),
  stockMinimo: yup.number().min(0, 'Stock mínimo debe ser positivo').required('Stock mínimo requerido'),
  stockMaximo: yup.number().min(0, 'Stock máximo debe ser positivo'),
  proveedor: yup.string(),
  fechaVencimiento: yup.date().nullable(),
  ubicacion: yup.string(),
  peso: yup.number().min(0, 'Peso debe ser positivo'),
  volumen: yup.number().min(0, 'Volumen debe ser positivo'),
  activo: yup.boolean()
});

type ProductoFormData = yup.InferType<typeof schema>;

interface ProductoFormProps {
  producto?: Producto;
  onSubmit: (data: Partial<Producto>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ProductoForm: React.FC<ProductoFormProps> = ({
  producto,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [categorias, setCategorias] = useState<CategoriaProducto[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [margenCalculado, setMargenCalculado] = useState({ pesos: 0, porcentaje: 0 });
  const [codigoGenerado, setCodigoGenerado] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<ProductoFormData>({
    resolver: yupResolver(schema),
    defaultValues: producto ? {
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      categoria: producto.categoria,
      codigo: producto.codigo || '',
      codigoBarras: producto.codigoBarras || '',
      unidadMedida: producto.unidadMedida,
      precioCompra: producto.precioCompra,
      precioVenta: producto.precioVenta,
      stock: producto.stock,
      stockMinimo: producto.stockMinimo,
      stockMaximo: producto.stockMaximo || undefined,
      proveedor: producto.proveedor || '',
      fechaVencimiento: producto.fechaVencimiento || null,
      ubicacion: producto.ubicacion || '',
      peso: producto.peso || undefined,
      volumen: producto.volumen || undefined,
      activo: producto.activo
    } : {
      activo: true,
      stock: 0,
      stockMinimo: 1,
      precioCompra: 0,
      precioVenta: 0
    }
  });

  const watchPrecioCompra = watch('precioCompra') || 0;
  const watchPrecioVenta = watch('precioVenta') || 0;
  const watchCategoria = watch('categoria');

  // Cargar categorías
  useEffect(() => {
    const loadCategorias = async () => {
      setLoadingCategorias(true);
      try {
        const categoriasData = await ProductosService.getCategorias();
        
        // Filtrar duplicados por nombre (mantener el más reciente)
        const categoriasUnicas = categoriasData.reduce((acc, categoria) => {
          const existente = acc.find(cat => cat.nombre.toLowerCase() === categoria.nombre.toLowerCase());
          if (!existente) {
            acc.push(categoria);
          } else if (categoria.updatedAt > existente.updatedAt) {
            // Reemplazar con el más reciente
            const index = acc.indexOf(existente);
            acc[index] = categoria;
          }
          return acc;
        }, [] as CategoriaProducto[]);
        
        setCategorias(categoriasUnicas);
      } catch (error) {
        console.error('Error al cargar categorías:', error);
        toast.error('Error al cargar categorías');
      } finally {
        setLoadingCategorias(false);
      }
    };

    loadCategorias();
  }, []);

  // Calcular margen cuando cambien los precios
  useEffect(() => {
    if (watchPrecioCompra > 0 && watchPrecioVenta > 0) {
      const margen = PreciosService.calcularMargenGanancia(watchPrecioCompra, watchPrecioVenta);
      setMargenCalculado({ pesos: margen.margenPesos, porcentaje: margen.margenPorcentaje });
    }
  }, [watchPrecioCompra, watchPrecioVenta]);

  // Generar código automático cuando cambie la categoría
  useEffect(() => {
    const generarCodigo = async () => {
      if (watchCategoria && !producto) { // Solo para productos nuevos
        try {
          const codigo = await ProductosService.generarCodigoAutomatico(watchCategoria);
          setCodigoGenerado(codigo);
          setValue('codigo', codigo);
        } catch (error) {
          console.error('Error al generar código:', error);
        }
      }
    };

    if (watchCategoria) {
      generarCodigo();
    }
  }, [watchCategoria, producto, setValue]);

  const handleFormSubmit = async (data: ProductoFormData) => {
    try {
      // Validar que el precio de venta sea mayor al de compra
      if (data.precioVenta <= data.precioCompra) {
        toast.error('El precio de venta debe ser mayor al precio de compra');
        return;
      }

      // Validar stock máximo si se proporciona
      if (data.stockMaximo && data.stockMaximo <= data.stockMinimo) {
        toast.error('El stock máximo debe ser mayor al stock mínimo');
        return;
      }

      await onSubmit(data as Partial<Producto>);
    } catch (error) {
      console.error('Error en formulario:', error);
      toast.error('Error al procesar el formulario');
    }
  };

  const calcularPrecioSugerido = (margen: number) => {
    const precioCompra = watchPrecioCompra || 0;
    if (precioCompra > 0) {
      const precioSugerido = PreciosService.calcularPrecioSugerido(precioCompra, margen);
      setValue('precioVenta', precioSugerido);
    }
  };

  const unidadesMedida = Object.values(UnidadMedida);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Package className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {producto ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
        </div>
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          disabled={isLoading}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Información Básica */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre del Producto *
              </label>
              <input
                {...register('nombre')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Ej: Agua Purificada 20L"
              />
              {errors.nombre && (
                <p className="text-red-500 text-sm mt-1">{errors.nombre.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descripción
              </label>
              <textarea
                {...register('descripcion')}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Descripción opcional del producto"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Categoría *
              </label>
              <select
                {...register('categoria')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={loadingCategorias}
              >
                <option value="">Seleccionar categoría</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
              {errors.categoria && (
                <p className="text-red-500 text-sm mt-1">{errors.categoria.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unidad de Medida *
              </label>
              <select
                {...register('unidadMedida')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">Seleccionar unidad</option>
                {unidadesMedida.map(unidad => (
                  <option key={unidad} value={unidad}>
                    {unidad.charAt(0).toUpperCase() + unidad.slice(1)}
                  </option>
                ))}
              </select>
              {errors.unidadMedida && (
                <p className="text-red-500 text-sm mt-1">{errors.unidadMedida.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Código del Producto
              </label>
              <div className="relative">
                <input
                  {...register('codigo')}
                  type="text"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="AUTO"
                />
                {codigoGenerado && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <Info className="h-4 w-4 text-green-500" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Código de Barras
              </label>
              <div className="relative">
                <input
                  {...register('codigoBarras')}
                  type="text"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Opcional"
                />
                <Barcode className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Precio Compra *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    {...register('precioCompra', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                {errors.precioCompra && (
                  <p className="text-red-500 text-sm mt-1">{errors.precioCompra.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Precio Venta *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    {...register('precioVenta', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                {errors.precioVenta && (
                  <p className="text-red-500 text-sm mt-1">{errors.precioVenta.message}</p>
                )}
              </div>
            </div>

            {/* Calculadora de Margen */}
            {watchPrecioCompra > 0 && watchPrecioVenta > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Margen de Ganancia
                  </span>
                  <Calculator className="h-4 w-4 text-gray-500" />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">En pesos:</span>
                    <span className="ml-2 font-semibold text-green-600">
                      ${margenCalculado.pesos}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Porcentaje:</span>
                    <span className="ml-2 font-semibold text-green-600">
                      {margenCalculado.porcentaje}%
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => calcularPrecioSugerido(30)}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    +30%
                  </button>
                  <button
                    type="button"
                    onClick={() => calcularPrecioSugerido(50)}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    +50%
                  </button>
                  <button
                    type="button"
                    onClick={() => calcularPrecioSugerido(100)}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    +100%
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stock Inicial *
                </label>
                <input
                  {...register('stock', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="0"
                />
                {errors.stock && (
                  <p className="text-red-500 text-sm mt-1">{errors.stock.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stock Mínimo *
                </label>
                <input
                  {...register('stockMinimo', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="1"
                />
                {errors.stockMinimo && (
                  <p className="text-red-500 text-sm mt-1">{errors.stockMinimo.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stock Máximo
                </label>
                <input
                  {...register('stockMaximo', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Opcional"
                />
                {errors.stockMaximo && (
                  <p className="text-red-500 text-sm mt-1">{errors.stockMaximo.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Configuración Avanzada */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
          >
            {showAdvanced ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span>Configuración Avanzada</span>
          </button>

          {showAdvanced && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Proveedor
                  </label>
                  <input
                    {...register('proveedor')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Nombre del proveedor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ubicación
                  </label>
                  <input
                    {...register('ubicacion')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Ej: Estante A, Fila 3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fecha de Vencimiento
                  </label>
                  <input
                    {...register('fechaVencimiento')}
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Peso (gramos)
                  </label>
                  <input
                    {...register('peso', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="0.0"
                  />
                  {errors.peso && (
                    <p className="text-red-500 text-sm mt-1">{errors.peso.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Volumen (ml)
                  </label>
                  <input
                    {...register('volumen', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="0.0"
                  />
                  {errors.volumen && (
                    <p className="text-red-500 text-sm mt-1">{errors.volumen.message}</p>
                  )}
                </div>

                <div className="flex items-center">
                  <input
                    {...register('activo')}
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                    Producto activo
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-600">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{isLoading ? 'Guardando...' : 'Guardar Producto'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
