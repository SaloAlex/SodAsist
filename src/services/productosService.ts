import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  Producto, 
  CategoriaProducto, 
  FiltrosProductos, 
  UnidadMedida,
  TipoMovimiento 
} from '../types';
import { FirebaseService } from './firebaseService';

export class ProductosService {
  
  /**
   * Obtener todos los productos con filtros opcionales
   */
  static async getProductos(filtros?: FiltrosProductos): Promise<Producto[]> {
    try {
      let q = collection(db, 'productos');
      const constraints = [];

      // Aplicar filtros
      if (filtros?.categoria) {
        constraints.push(where('categoria', '==', filtros.categoria));
      }
      
      if (filtros?.activo !== undefined) {
        constraints.push(where('activo', '==', filtros.activo));
      }
      
      if (filtros?.proveedor) {
        constraints.push(where('proveedor', '==', filtros.proveedor));
      }

      // Ordenar por nombre
      constraints.push(orderBy('nombre', 'asc'));

      if (constraints.length > 0) {
        q = query(collection(db, 'productos'), ...constraints);
      }

      const querySnapshot = await getDocs(q);
      const productos = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertTimestamps(doc.data())
      })) as Producto[];

      // Filtros que no se pueden hacer en Firestore
      let productosFiltrados = productos;

      if (filtros?.busqueda) {
        const busqueda = filtros.busqueda.toLowerCase();
        productosFiltrados = productos.filter(p => 
          p.nombre.toLowerCase().includes(busqueda) ||
          p.descripcion?.toLowerCase().includes(busqueda) ||
          p.codigo?.toLowerCase().includes(busqueda) ||
          p.codigoBarras?.toLowerCase().includes(busqueda)
        );
      }

      if (filtros?.conStock) {
        productosFiltrados = productosFiltrados.filter(p => p.stock > 0);
      }

      if (filtros?.stockBajo) {
        productosFiltrados = productosFiltrados.filter(p => p.stock <= p.stockMinimo);
      }

      return productosFiltrados;
    } catch (error) {
      console.error('Error al obtener productos:', error);
      throw error;
    }
  }

  /**
   * Obtener un producto por ID
   */
  static async getProducto(id: string): Promise<Producto | null> {
    try {
      const docRef = doc(db, 'productos', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...this.convertTimestamps(docSnap.data())
        } as Producto;
      }
      
      return null;
    } catch (error) {
      console.error('Error al obtener producto:', error);
      throw error;
    }
  }

  /**
   * Crear un nuevo producto
   */
  static async crearProducto(producto: Omit<Producto, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // Validar que no exista otro producto con el mismo código
      if (producto.codigo) {
        const existente = await this.getProductoPorCodigo(producto.codigo);
        if (existente) {
          throw new Error('Ya existe un producto con ese código');
        }
      }

      const docRef = await addDoc(collection(db, 'productos'), {
        ...producto,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error al crear producto:', error);
      throw error;
    }
  }

  /**
   * Actualizar un producto
   */
  static async actualizarProducto(id: string, producto: Partial<Producto>): Promise<void> {
    try {
      // Validar código único si se está actualizando
      if (producto.codigo) {
        const existente = await this.getProductoPorCodigo(producto.codigo);
        if (existente && existente.id !== id) {
          throw new Error('Ya existe un producto con ese código');
        }
      }

      const docRef = doc(db, 'productos', id);
      await updateDoc(docRef, {
        ...producto,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      throw error;
    }
  }

  /**
   * Eliminar un producto (soft delete)
   */
  static async eliminarProducto(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'productos', id);
      await updateDoc(docRef, {
        activo: false,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      throw error;
    }
  }

  /**
   * Obtener producto por código
   */
  static async getProductoPorCodigo(codigo: string): Promise<Producto | null> {
    try {
      const q = query(
        collection(db, 'productos'),
        where('codigo', '==', codigo),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...this.convertTimestamps(doc.data())
        } as Producto;
      }
      
      return null;
    } catch (error) {
      console.error('Error al buscar producto por código:', error);
      throw error;
    }
  }

  /**
   * Actualizar stock de un producto
   */
  static async actualizarStock(
    productoId: string, 
    nuevaCantidad: number, 
    motivo: string,
    usuario: string,
    referencia?: string
  ): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Obtener producto actual
      const producto = await this.getProducto(productoId);
      if (!producto) {
        throw new Error('Producto no encontrado');
      }

      // Actualizar stock del producto
      const productoRef = doc(db, 'productos', productoId);
      batch.update(productoRef, {
        stock: nuevaCantidad,
        updatedAt: serverTimestamp()
      });

      // Crear movimiento de inventario
      const movimientoRef = doc(collection(db, 'movimientosInventario'));
      batch.set(movimientoRef, {
        productoId,
        tipo: nuevaCantidad > producto.stock ? TipoMovimiento.ENTRADA : TipoMovimiento.SALIDA,
        cantidad: Math.abs(nuevaCantidad - producto.stock),
        cantidadAnterior: producto.stock,
        cantidadNueva: nuevaCantidad,
        motivo,
        referencia,
        fecha: serverTimestamp(),
        usuario,
        createdAt: serverTimestamp()
      });

      await batch.commit();
    } catch (error) {
      console.error('Error al actualizar stock:', error);
      throw error;
    }
  }

  /**
   * Generar código automático para producto
   */
  static async generarCodigoAutomatico(categoria: string): Promise<string> {
    try {
      // Obtener productos de la misma categoría
      const q = query(
        collection(db, 'productos'),
        where('categoria', '==', categoria),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      let numeroSiguiente = 1;
      
      if (!querySnapshot.empty) {
        const ultimoProducto = querySnapshot.docs[0].data();
        if (ultimoProducto.codigo) {
          // Extraer número del código (asumiendo formato CAT-001)
          const match = ultimoProducto.codigo.match(/(\d+)$/);
          if (match) {
            numeroSiguiente = parseInt(match[1]) + 1;
          }
        }
      }

      // Generar código con formato CAT-001
      const prefijo = categoria.substring(0, 3).toUpperCase();
      return `${prefijo}-${numeroSiguiente.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error al generar código automático:', error);
      throw error;
    }
  }

  // ============================================
  // GESTIÓN DE CATEGORÍAS
  // ============================================

  /**
   * Obtener todas las categorías
   */
  static async getCategorias(): Promise<CategoriaProducto[]> {
    try {
      const q = query(
        collection(db, 'categoriasProductos'),
        orderBy('orden', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertTimestamps(doc.data())
      })) as CategoriaProducto[];
    } catch (error) {
      console.error('Error al obtener categorías:', error);
      throw error;
    }
  }

  /**
   * Crear nueva categoría (con verificación de duplicados)
   */
  static async crearCategoria(categoria: Omit<CategoriaProducto, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // Verificar si ya existe una categoría con el mismo nombre
      const categoriasExistentes = await this.getCategorias();
      const categoriaExistente = categoriasExistentes.find(cat => 
        cat.nombre.toLowerCase() === categoria.nombre.toLowerCase()
      );

      if (categoriaExistente) {
        console.log(`Categoría "${categoria.nombre}" ya existe, devolviendo ID existente`);
        return categoriaExistente.id;
      }

      const docRef = await addDoc(collection(db, 'categoriasProductos'), {
        ...categoria,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error al crear categoría:', error);
      throw error;
    }
  }

  /**
   * Actualizar categoría
   */
  static async actualizarCategoria(id: string, categoria: Partial<CategoriaProducto>): Promise<void> {
    try {
      const docRef = doc(db, 'categoriasProductos', id);
      await updateDoc(docRef, {
        ...categoria,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error al actualizar categoría:', error);
      throw error;
    }
  }

  /**
   * Eliminar categoría
   */
  static async eliminarCategoria(id: string): Promise<void> {
    try {
      // Verificar que no haya productos usando esta categoría
      const productosConCategoria = await this.getProductos({ categoria: id });
      if (productosConCategoria.length > 0) {
        throw new Error('No se puede eliminar la categoría porque tiene productos asociados');
      }

      const docRef = doc(db, 'categoriasProductos', id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      throw error;
    }
  }

  // ============================================
  // UTILIDADES
  // ============================================

  /**
   * Obtener productos con stock bajo
   */
  static async getProductosStockBajo(): Promise<Producto[]> {
    try {
      const productos = await this.getProductos({ activo: true });
      return productos.filter(p => p.stock <= p.stockMinimo);
    } catch (error) {
      console.error('Error al obtener productos con stock bajo:', error);
      throw error;
    }
  }

  /**
   * Obtener productos agotados
   */
  static async getProductosAgotados(): Promise<Producto[]> {
    try {
      const productos = await this.getProductos({ activo: true });
      return productos.filter(p => p.stock === 0);
    } catch (error) {
      console.error('Error al obtener productos agotados:', error);
      throw error;
    }
  }

  /**
   * Obtener valor total del inventario
   */
  static async getValorTotalInventario(): Promise<number> {
    try {
      const productos = await this.getProductos({ activo: true });
      return productos.reduce((total, producto) => {
        return total + (producto.stock * producto.precioCompra);
      }, 0);
    } catch (error) {
      console.error('Error al calcular valor total del inventario:', error);
      throw error;
    }
  }

  /**
   * Validar disponibilidad de stock para una venta
   */
  static async validarDisponibilidad(productos: { productoId: string; cantidad: number }[]): Promise<{
    disponible: boolean;
    faltantes: { productoId: string; nombre: string; disponible: number; solicitado: number }[];
  }> {
    try {
      const faltantes = [];
      
      for (const item of productos) {
        const producto = await this.getProducto(item.productoId);
        if (!producto) {
          faltantes.push({
            productoId: item.productoId,
            nombre: 'Producto no encontrado',
            disponible: 0,
            solicitado: item.cantidad
          });
        } else if (producto.stock < item.cantidad) {
          faltantes.push({
            productoId: item.productoId,
            nombre: producto.nombre,
            disponible: producto.stock,
            solicitado: item.cantidad
          });
        }
      }

      return {
        disponible: faltantes.length === 0,
        faltantes
      };
    } catch (error) {
      console.error('Error al validar disponibilidad:', error);
      throw error;
    }
  }

  /**
   * Convertir timestamps de Firestore a Date
   */
  private static convertTimestamps(data: any): any {
    if (data instanceof Timestamp) {
      return data.toDate();
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.convertTimestamps(item));
    }
    
    if (data && typeof data === 'object') {
      const converted: any = {};
      for (const [key, value] of Object.entries(data)) {
        converted[key] = this.convertTimestamps(value);
      }
      return converted;
    }
    
    return data;
  }

  /**
   * Crear productos iniciales por defecto
   */
  static async crearProductosIniciales(usuario: string): Promise<void> {
    try {
      // Crear categorías por defecto
      const categoriaAgua = await this.crearCategoria({
        nombre: 'Agua',
        descripcion: 'Productos de agua purificada',
        color: '#3B82F6',
        icono: 'droplets',
        activa: true,
        orden: 1
      });

      const categoriaSodas = await this.crearCategoria({
        nombre: 'Sodas',
        descripcion: 'Bebidas gaseosas y sodas',
        color: '#EF4444',
        icono: 'cup-soda',
        activa: true,
        orden: 2
      });

      const categoriaEnvases = await this.crearCategoria({
        nombre: 'Envases',
        descripcion: 'Envases retornables',
        color: '#10B981',
        icono: 'recycle',
        activa: true,
        orden: 3
      });

      // Crear productos por defecto
      const productosIniciales = [
        {
          nombre: 'Soda 500ml',
          descripcion: 'Soda saborizada 500ml',
          categoria: categoriaSodas,
          codigo: 'SOD-001',
          unidadMedida: UnidadMedida.UNIDAD,
          precioCompra: 30,
          precioVenta: 50,
          stock: 100,
          stockMinimo: 20,
          activo: true,
          createdBy: usuario,
          updatedBy: usuario
        },
        {
          nombre: 'Bidón 10L',
          descripcion: 'Bidón de agua purificada 10 litros',
          categoria: categoriaAgua,
          codigo: 'AGU-001',
          unidadMedida: UnidadMedida.UNIDAD,
          precioCompra: 200,
          precioVenta: 300,
          stock: 50,
          stockMinimo: 10,
          volumen: 10000,
          activo: true,
          createdBy: usuario,
          updatedBy: usuario
        },
        {
          nombre: 'Bidón 20L',
          descripcion: 'Bidón de agua purificada 20 litros',
          categoria: categoriaAgua,
          codigo: 'AGU-002',
          unidadMedida: UnidadMedida.UNIDAD,
          precioCompra: 350,
          precioVenta: 500,
          stock: 30,
          stockMinimo: 5,
          volumen: 20000,
          activo: true,
          createdBy: usuario,
          updatedBy: usuario
        },
        {
          nombre: 'Envase Retornable',
          descripcion: 'Envase retornable para bidones',
          categoria: categoriaEnvases,
          codigo: 'ENV-001',
          unidadMedida: UnidadMedida.UNIDAD,
          precioCompra: 0,
          precioVenta: 0,
          stock: 0,
          stockMinimo: 0,
          activo: true,
          createdBy: usuario,
          updatedBy: usuario
        }
      ];

      // Crear productos usando batch
      const batch = writeBatch(db);
      productosIniciales.forEach(producto => {
        const docRef = doc(collection(db, 'productos'));
        batch.set(docRef, {
          ...producto,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error al crear productos iniciales:', error);
      throw error;
    }
  }
}
