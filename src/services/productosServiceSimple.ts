import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  Producto, 
  CategoriaProducto, 
  UnidadMedida 
} from '../types';

/**
 * Versión simplificada del servicio de productos
 * Sin consultas complejas que requieran índices
 */
export class ProductosServiceSimple {
  
  /**
   * Obtener todos los productos (sin filtros)
   */
  static async getProductos(): Promise<Producto[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'productos'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Producto[];
    } catch (error) {
      console.error('Error al obtener productos:', error);
      throw error;
    }
  }

  /**
   * Crear un nuevo producto
   */
  static async crearProducto(producto: Omit<Producto, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
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
   * Obtener todas las categorías (sin ordenamiento)
   */
  static async getCategorias(): Promise<CategoriaProducto[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'categoriasProductos'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as CategoriaProducto[];
    } catch (error) {
      console.error('Error al obtener categorías:', error);
      throw error;
    }
  }

  /**
   * Crear nueva categoría
   */
  static async crearCategoria(categoria: Omit<CategoriaProducto, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
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
   * Crear productos iniciales básicos
   */
  static async crearProductosIniciales(usuario: string): Promise<void> {
    try {
      console.log('🚀 Creando productos iniciales...');

      // Crear categorías básicas
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

      console.log('✅ Categorías creadas');

      // Crear productos básicos
      const productos = [
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
        }
      ];

      // Crear productos
      for (const producto of productos) {
        await this.crearProducto(producto);
        console.log(`✅ Producto creado: ${producto.nombre}`);
      }

      console.log('🎉 Productos iniciales creados exitosamente!');
    } catch (error) {
      console.error('Error al crear productos iniciales:', error);
      throw error;
    }
  }
}
