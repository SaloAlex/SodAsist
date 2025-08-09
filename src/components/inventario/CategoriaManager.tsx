import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Tag,
  Palette,
  Grid3X3,
  AlertTriangle,
  Check
} from 'lucide-react';
import { CategoriaProducto } from '../../types';
import { ProductosService } from '../../services/productosService';
import { LoadingSpinner } from '../common/LoadingSpinner';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const schema = yup.object().shape({
  nombre: yup.string().required('Nombre requerido').min(2, 'Mínimo 2 caracteres'),
  descripcion: yup.string(),
  color: yup.string().required('Color requerido'),
  icono: yup.string().required('Icono requerido'),
  orden: yup.number().min(1, 'Orden debe ser mayor a 0').required('Orden requerido'),
  activa: yup.boolean()
});

type CategoriaFormData = yup.InferType<typeof schema>;

interface CategoriaManagerProps {
  onClose: () => void;
}

const COLORES_DISPONIBLES = [
  { valor: '#3B82F6', nombre: 'Azul' },
  { valor: '#EF4444', nombre: 'Rojo' },
  { valor: '#10B981', nombre: 'Verde' },
  { valor: '#F59E0B', nombre: 'Amarillo' },
  { valor: '#8B5CF6', nombre: 'Púrpura' },
  { valor: '#EC4899', nombre: 'Rosa' },
  { valor: '#06B6D4', nombre: 'Cian' },
  { valor: '#84CC16', nombre: 'Lima' },
  { valor: '#F97316', nombre: 'Naranja' },
  { valor: '#6B7280', nombre: 'Gris' }
];

const ICONOS_DISPONIBLES = [
  { valor: 'package', nombre: 'Paquete' },
  { valor: 'droplets', nombre: 'Gotas' },
  { valor: 'cup-soda', nombre: 'Bebida' },
  { valor: 'bottle', nombre: 'Botella' },
  { valor: 'coffee', nombre: 'Café' },
  { valor: 'apple', nombre: 'Manzana' },
  { valor: 'cookie', nombre: 'Galleta' },
  { valor: 'ice-cream', nombre: 'Helado' },
  { valor: 'pizza', nombre: 'Pizza' },
  { valor: 'candy', nombre: 'Dulce' },
  { valor: 'milk', nombre: 'Leche' },
  { valor: 'wheat', nombre: 'Trigo' },
  { valor: 'recycle', nombre: 'Reciclar' },
  { valor: 'shopping-bag', nombre: 'Bolsa' },
  { valor: 'box', nombre: 'Caja' }
];

export const CategoriaManager: React.FC<CategoriaManagerProps> = ({ onClose }) => {
  const [categorias, setCategorias] = useState<CategoriaProducto[]>([]);
  const [loading, setLoading] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mostrandoForm, setMostrandoForm] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<CategoriaFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      activa: true,
      orden: 1
    }
  });

  const watchColor = watch('color');

  // Cargar categorías
  useEffect(() => {
    loadCategorias();
  }, []);

  const loadCategorias = async () => {
    setLoading(true);
    try {
      const categoriasDataRaw = await ProductosService.getCategorias();
      
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
      
      setCategorias(categoriasUnicas);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      toast.error('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  const handleCrear = () => {
    const siguienteOrden = Math.max(...categorias.map(c => c.orden), 0) + 1;
    reset({
      nombre: '',
      descripcion: '',
      color: COLORES_DISPONIBLES[0].valor,
      icono: ICONOS_DISPONIBLES[0].valor,
      orden: siguienteOrden,
      activa: true
    });
    setEditandoId(null);
    setMostrandoForm(true);
  };

  const handleEditar = (categoria: CategoriaProducto) => {
    setValue('nombre', categoria.nombre);
    setValue('descripcion', categoria.descripcion || '');
    setValue('color', categoria.color);
    setValue('icono', categoria.icono);
    setValue('orden', categoria.orden);
    setValue('activa', categoria.activa);
    setEditandoId(categoria.id);
    setMostrandoForm(true);
  };

  const handleGuardar = async (data: CategoriaFormData) => {
    try {
      setLoading(true);
      
      if (editandoId) {
        // Actualizar categoría existente
        await ProductosService.actualizarCategoria(editandoId, data);
        toast.success('Categoría actualizada correctamente');
      } else {
        // Crear nueva categoría
        await ProductosService.crearCategoria(data);
        toast.success('Categoría creada correctamente');
      }

      await loadCategorias();
      handleCancelar();
    } catch (error) {
      console.error('Error al guardar categoría:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar categoría');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id: string) => {
    if (eliminandoId === id) {
      try {
        setLoading(true);
        await ProductosService.eliminarCategoria(id);
        toast.success('Categoría eliminada correctamente');
        await loadCategorias();
        setEliminandoId(null);
      } catch (error) {
        console.error('Error al eliminar categoría:', error);
        toast.error(error instanceof Error ? error.message : 'Error al eliminar categoría');
      } finally {
        setLoading(false);
      }
    } else {
      setEliminandoId(id);
    }
  };

  const handleCancelar = () => {
    setMostrandoForm(false);
    setEditandoId(null);
    setEliminandoId(null);
    reset();
  };

  const getIconComponent = (iconName: string) => {
    // En una implementación real, aquí mapearías los nombres de iconos a componentes
    return <Tag className="h-5 w-5" />;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center space-x-3">
          <Grid3X3 className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Gestión de Categorías
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCrear}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Categoría</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Formulario */}
        {mostrandoForm && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-blue-200 dark:border-blue-600">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editandoId ? 'Editar Categoría' : 'Nueva Categoría'}
            </h3>
            
            <form onSubmit={handleSubmit(handleGuardar)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre *
                  </label>
                  <input
                    {...register('nombre')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Ej: Bebidas"
                  />
                  {errors.nombre && (
                    <p className="text-red-500 text-sm mt-1">{errors.nombre.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Orden *
                  </label>
                  <input
                    {...register('orden', { valueAsNumber: true })}
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="1"
                  />
                  {errors.orden && (
                    <p className="text-red-500 text-sm mt-1">{errors.orden.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  {...register('descripcion')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Descripción opcional de la categoría"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Color *
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {COLORES_DISPONIBLES.map(color => (
                      <label key={color.valor} className="cursor-pointer">
                        <input
                          {...register('color')}
                          type="radio"
                          value={color.valor}
                          className="sr-only"
                        />
                        <div
                          className={clsx(
                            'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all',
                            watchColor === color.valor
                              ? 'border-gray-900 dark:border-white scale-110'
                              : 'border-gray-300 dark:border-gray-600'
                          )}
                          style={{ backgroundColor: color.valor }}
                          title={color.nombre}
                        >
                          {watchColor === color.valor && (
                            <Check className="h-4 w-4 text-white" />
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.color && (
                    <p className="text-red-500 text-sm mt-1">{errors.color.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Icono *
                  </label>
                  <select
                    {...register('icono')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    {ICONOS_DISPONIBLES.map(icono => (
                      <option key={icono.valor} value={icono.valor}>
                        {icono.nombre}
                      </option>
                    ))}
                  </select>
                  {errors.icono && (
                    <p className="text-red-500 text-sm mt-1">{errors.icono.message}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <input
                  {...register('activa')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                  Categoría activa
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                <button
                  type="button"
                  onClick={handleCancelar}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{loading ? 'Guardando...' : 'Guardar'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Categorías */}
        {loading && !mostrandoForm ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="space-y-3">
            {categorias.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Grid3X3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay categorías creadas</p>
                <p className="text-sm">Crea tu primera categoría para organizar tus productos</p>
              </div>
            ) : (
              categorias.map(categoria => (
                <div
                  key={categoria.id}
                  className={clsx(
                    'flex items-center justify-between p-4 bg-white dark:bg-gray-700 border rounded-lg transition-all',
                    categoria.activa
                      ? 'border-gray-200 dark:border-gray-600'
                      : 'border-gray-200 dark:border-gray-600 opacity-60'
                  )}
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                      style={{ backgroundColor: categoria.color }}
                    >
                      {getIconComponent(categoria.icono)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {categoria.nombre}
                        {!categoria.activa && (
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                            (Inactiva)
                          </span>
                        )}
                      </h4>
                      {categoria.descripcion && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {categoria.descripcion}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Orden: {categoria.orden}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditar(categoria)}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      disabled={loading}
                      title="Editar categoría"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    
                    {eliminandoId === categoria.id ? (
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-xs text-red-600 dark:text-red-400">
                          ¿Confirmar?
                        </span>
                        <button
                          onClick={() => handleEliminar(categoria.id)}
                          className="p-1 text-red-600 hover:text-red-800 transition-colors"
                          disabled={loading}
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => setEliminandoId(null)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          disabled={loading}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEliminar(categoria.id)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        disabled={loading}
                        title="Eliminar categoría"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
