import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProductosService } from '../services/productosService';
import { InventarioService } from '../services/inventarioService';
import { Producto, CategoriaProducto, FiltrosProductos, PaginacionProductos, ResultadoPaginado, TipoMovimiento, ResultadoTransaccion } from '../types';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

// Query Keys
export const queryKeys = {
  productos: ['productos'] as const,
  productosWithFilters: (filtros: FiltrosProductos) => ['productos', 'filtros', filtros] as const,
  productosPaginados: (filtros: FiltrosProductos, paginacion: PaginacionProductos) => 
    ['productos', 'paginados', filtros, paginacion] as const,
  categorias: ['categorias'] as const,
  producto: (id: string) => ['producto', id] as const,
  categoria: (id: string) => ['categoria', id] as const,
};

// Hook para obtener productos con filtros
export const useProductos = (filtros: FiltrosProductos = {}) => {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: queryKeys.productosWithFilters(filtros),
    queryFn: () => ProductosService.getProductos(filtros),
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutos para productos
    select: (data) => {
      // Filtrar productos duplicados (mantener el más reciente)
      return data.reduce((acc, producto) => {
        const existente = acc.find(p => p.codigo === producto.codigo && p.codigo);
        if (!existente) {
          acc.push(producto);
        } else if (producto.updatedAt > existente.updatedAt) {
          const index = acc.indexOf(existente);
          acc[index] = producto;
        }
        return acc;
      }, [] as Producto[]);
    },
  });
};

// Hook para obtener productos con paginación
export const useProductosPaginados = (
  filtros: FiltrosProductos = {},
  paginacion: PaginacionProductos = { pagina: 1, limite: 20 }
) => {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: queryKeys.productosPaginados(filtros, paginacion),
    queryFn: () => ProductosService.getProductosPaginados(filtros, paginacion),
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutos para productos paginados
    keepPreviousData: true, // Mantener datos anteriores mientras carga la nueva página
  });
};

// Hook para obtener categorías
export const useCategorias = () => {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: queryKeys.categorias,
    queryFn: () => ProductosService.getCategorias(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos para categorías (cambian menos)
    select: (data) => {
      // Filtrar categorías duplicadas (mantener la más reciente)
      return data.reduce((acc, categoria) => {
        const existente = acc.find(cat => cat.nombre.toLowerCase() === categoria.nombre.toLowerCase());
        if (!existente) {
          acc.push(categoria);
        } else if (categoria.updatedAt > existente.updatedAt) {
          const index = acc.indexOf(existente);
          acc[index] = categoria;
        }
        return acc;
      }, [] as CategoriaProducto[]);
    },
  });
};

// Hook para obtener un producto específico
export const useProducto = (id: string) => {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: queryKeys.producto(id),
    queryFn: () => ProductosService.getProducto(id),
    enabled: !!user && !!id,
    staleTime: 2 * 60 * 1000,
  });
};

// Hook para crear producto
export const useCrearProducto = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  return useMutation({
    mutationFn: (producto: Partial<Producto>) => {
      if (!user) throw new Error('Usuario no autenticado');
      return ProductosService.crearProducto(producto, user.uid);
    },
    onSuccess: (nuevoProducto) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: queryKeys.productos });
      queryClient.invalidateQueries({ queryKey: queryKeys.categorias });
      
      // Agregar el nuevo producto al cache
      queryClient.setQueryData(queryKeys.producto(nuevoProducto.id), nuevoProducto);
      
      toast.success('Producto creado exitosamente');
    },
    onError: (error) => {
      console.error('Error al crear producto:', error);
      toast.error('Error al crear el producto');
    },
  });
};

// Hook para actualizar producto
export const useActualizarProducto = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  return useMutation({
    mutationFn: ({ id, producto }: { id: string; producto: Partial<Producto> }) => {
      if (!user) throw new Error('Usuario no autenticado');
      return ProductosService.actualizarProducto(id, producto, user.uid);
    },
    onSuccess: (productoActualizado, { id }) => {
      // Actualizar el producto específico en el cache
      queryClient.setQueryData(queryKeys.producto(id), productoActualizado);
      
      // Invalidar la lista de productos para que se actualice
      queryClient.invalidateQueries({ queryKey: queryKeys.productos });
      
      toast.success('Producto actualizado exitosamente');
    },
    onError: (error) => {
      console.error('Error al actualizar producto:', error);
      toast.error('Error al actualizar el producto');
    },
  });
};

// Hook para eliminar producto
export const useEliminarProducto = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  return useMutation({
    mutationFn: (id: string) => {
      if (!user) throw new Error('Usuario no autenticado');
      return ProductosService.eliminarProducto(id, user.uid);
    },
    onSuccess: (_, id) => {
      // Remover el producto del cache
      queryClient.removeQueries({ queryKey: queryKeys.producto(id) });
      
      // Invalidar la lista de productos
      queryClient.invalidateQueries({ queryKey: queryKeys.productos });
      
      toast.success('Producto eliminado exitosamente');
    },
    onError: (error) => {
      console.error('Error al eliminar producto:', error);
      toast.error('Error al eliminar el producto');
    },
  });
};

// Hook para crear categoría
export const useCrearCategoria = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  return useMutation({
    mutationFn: (categoria: Partial<CategoriaProducto>) => {
      if (!user) throw new Error('Usuario no autenticado');
      return ProductosService.crearCategoria(categoria, user.uid);
    },
    onSuccess: (nuevaCategoria) => {
      // Invalidar categorías
      queryClient.invalidateQueries({ queryKey: queryKeys.categorias });
      
      // Agregar la nueva categoría al cache
      queryClient.setQueryData(queryKeys.categoria(nuevaCategoria.id), nuevaCategoria);
      
      toast.success('Categoría creada exitosamente');
    },
    onError: (error) => {
      console.error('Error al crear categoría:', error);
      toast.error('Error al crear la categoría');
    },
  });
};

// Hook para actualizar categoría
export const useActualizarCategoria = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  return useMutation({
    mutationFn: ({ id, categoria }: { id: string; categoria: Partial<CategoriaProducto> }) => {
      if (!user) throw new Error('Usuario no autenticado');
      return ProductosService.actualizarCategoria(id, categoria, user.uid);
    },
    onSuccess: (categoriaActualizada, { id }) => {
      // Actualizar la categoría específica en el cache
      queryClient.setQueryData(queryKeys.categoria(id), categoriaActualizada);
      
      // Invalidar la lista de categorías
      queryClient.invalidateQueries({ queryKey: queryKeys.categorias });
      
      toast.success('Categoría actualizada exitosamente');
    },
    onError: (error) => {
      console.error('Error al actualizar categoría:', error);
      toast.error('Error al actualizar la categoría');
    },
  });
};

// Hook para eliminar categoría
export const useEliminarCategoria = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  return useMutation({
    mutationFn: (id: string) => {
      if (!user) throw new Error('Usuario no autenticado');
      return ProductosService.eliminarCategoria(id, user.uid);
    },
    onSuccess: (_, id) => {
      // Remover la categoría del cache
      queryClient.removeQueries({ queryKey: queryKeys.categoria(id) });
      
      // Invalidar la lista de categorías
      queryClient.invalidateQueries({ queryKey: queryKeys.categorias });
      
      toast.success('Categoría eliminada exitosamente');
    },
    onError: (error) => {
      console.error('Error al eliminar categoría:', error);
      toast.error('Error al eliminar la categoría');
    },
  });
};

// Hook para prefetch de datos
export const usePrefetchProductos = () => {
  const queryClient = useQueryClient();
  
  return {
    prefetchProductos: (filtros: FiltrosProductos = {}) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.productosWithFilters(filtros),
        queryFn: () => ProductosService.getProductos(filtros),
        staleTime: 2 * 60 * 1000,
      });
    },
    prefetchCategorias: () => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.categorias,
        queryFn: () => ProductosService.getCategorias(),
        staleTime: 5 * 60 * 1000,
      });
    },
  };
};

// Hook para registrar movimiento con transacción atómica
export const useRegistrarMovimientoAtomico = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  return useMutation({
    mutationFn: async ({
      productoId,
      tipo,
      cantidad,
      motivo,
      referencia,
      observaciones
    }: {
      productoId: string;
      tipo: TipoMovimiento;
      cantidad: number;
      motivo: string;
      referencia?: string;
      observaciones?: string;
    }) => {
      if (!user) throw new Error('Usuario no autenticado');
      return InventarioService.registrarMovimientoAtomico(
        productoId,
        tipo,
        cantidad,
        motivo,
        user.uid,
        referencia,
        observaciones
      );
    },
    onSuccess: (resultado: ResultadoTransaccion) => {
      if (resultado.exito) {
        // Invalidar queries relacionadas
        queryClient.invalidateQueries({ queryKey: queryKeys.productos });
        queryClient.invalidateQueries({ queryKey: queryKeys.categorias });
        
        toast.success(resultado.mensaje);
      } else {
        // Mostrar errores de validación
        if (resultado.errores && resultado.errores.length > 0) {
          resultado.errores.forEach(error => toast.error(error));
        } else {
          toast.error(resultado.mensaje);
        }
      }
    },
    onError: (error) => {
      console.error('Error al registrar movimiento:', error);
      toast.error('Error al registrar el movimiento');
    },
  });
};

// Hook para registrar múltiples movimientos
export const useRegistrarMovimientosMultiples = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  return useMutation({
    mutationFn: async ({
      movimientos,
      referencia
    }: {
      movimientos: Array<{
        productoId: string;
        tipo: TipoMovimiento;
        cantidad: number;
        motivo: string;
      }>;
      referencia?: string;
    }) => {
      if (!user) throw new Error('Usuario no autenticado');
      return InventarioService.registrarMovimientosMultiples(
        movimientos,
        user.uid,
        referencia
      );
    },
    onSuccess: (resultados: ResultadoTransaccion[]) => {
      const exitosos = resultados.filter(r => r.exito).length;
      const fallidos = resultados.filter(r => !r.exito).length;
      
      if (exitosos > 0) {
        // Invalidar queries relacionadas
        queryClient.invalidateQueries({ queryKey: queryKeys.productos });
        queryClient.invalidateQueries({ queryKey: queryKeys.categorias });
        
        toast.success(`${exitosos} movimientos registrados exitosamente`);
      }
      
      if (fallidos > 0) {
        toast.error(`${fallidos} movimientos fallaron`);
        
        // Mostrar errores específicos
        resultados.forEach((resultado, index) => {
          if (!resultado.exito && resultado.errores) {
            resultado.errores.forEach(error => 
              toast.error(`Movimiento ${index + 1}: ${error}`)
            );
          }
        });
      }
    },
    onError: (error) => {
      console.error('Error al registrar movimientos múltiples:', error);
      toast.error('Error al registrar los movimientos');
    },
  });
};
