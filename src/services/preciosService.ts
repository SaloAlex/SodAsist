import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  Timestamp,
  DocumentData
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  HistorialPrecio,
  Producto,
  ConfiguracionInventario
} from '../types';
import { ProductosService } from './productosService';

export class PreciosService {
  
  /**
   * Actualizar precio de un producto
   */
  static async actualizarPrecio(
    productoId: string,
    nuevoPrecioVenta: number,
    nuevoPrecioCompra?: number,
    motivo: string = 'Actualización de precio',
    usuario: string = 'sistema'
  ): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Obtener producto actual
      const producto = await ProductosService.getProducto(productoId);
      if (!producto) {
        throw new Error('Producto no encontrado');
      }

      // Crear historial de precio de venta si cambió
      if (nuevoPrecioVenta !== producto.precioVenta) {
        const historialVentaRef = doc(collection(db, 'historialPrecios'));
        batch.set(historialVentaRef, {
          productoId,
          precioAnterior: producto.precioVenta,
          precioNuevo: nuevoPrecioVenta,
          tipo: 'venta',
          motivo,
          fecha: serverTimestamp(),
          usuario,
          createdAt: serverTimestamp()
        });
      }

      // Crear historial de precio de compra si cambió y se proporcionó
      if (nuevoPrecioCompra !== undefined && nuevoPrecioCompra !== producto.precioCompra) {
        const historialCompraRef = doc(collection(db, 'historialPrecios'));
        batch.set(historialCompraRef, {
          productoId,
          precioAnterior: producto.precioCompra,
          precioNuevo: nuevoPrecioCompra,
          tipo: 'compra',
          motivo,
          fecha: serverTimestamp(),
          usuario,
          createdAt: serverTimestamp()
        });
      }

      // Actualizar producto
      const updateData: Partial<Producto> = {
        precioVenta: nuevoPrecioVenta,
        updatedAt: new Date(),
        updatedBy: usuario
      };

      if (nuevoPrecioCompra !== undefined) {
        updateData.precioCompra = nuevoPrecioCompra;
      }

      const productoRef = doc(db, 'productos', productoId);
      batch.update(productoRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });

      await batch.commit();
    } catch (error) {
      console.error('Error al actualizar precio:', error);
      throw error;
    }
  }

  /**
   * Actualizar precios masivos con porcentaje
   */
  static async actualizarPreciosMasivos(
    porcentaje: number,
    tipo: 'incremento' | 'decremento',
    categoria?: string,
    usuario: string = 'sistema'
  ): Promise<{ actualizados: number; errores: number }> {
    try {
      const batch = writeBatch(db);
      let actualizados = 0;
      let errores = 0;

      // Obtener productos a actualizar
      const filtros: { activo?: boolean; categoria?: string } = { activo: true };
      if (categoria) {
        filtros.categoria = categoria;
      }

      const productos = await ProductosService.getProductos(filtros);

      for (const producto of productos) {
        try {
          const factor = tipo === 'incremento' ? (1 + porcentaje / 100) : (1 - porcentaje / 100);
          const nuevoPrecioVenta = Math.round(producto.precioVenta * factor * 100) / 100;
          const nuevoPrecioCompra = producto.precioCompra 
            ? Math.round(producto.precioCompra * factor * 100) / 100 
            : undefined;

          // Crear historial de precio de venta
          const historialVentaRef = doc(collection(db, 'historialPrecios'));
          batch.set(historialVentaRef, {
            productoId: producto.id,
            precioAnterior: producto.precioVenta,
            precioNuevo: nuevoPrecioVenta,
            tipo: 'venta',
            motivo: `Actualización masiva: ${tipo} del ${porcentaje}%`,
            fecha: serverTimestamp(),
            usuario,
            createdAt: serverTimestamp()
          });

          // Crear historial de precio de compra si existe
          if (nuevoPrecioCompra !== undefined && producto.precioCompra) {
            const historialCompraRef = doc(collection(db, 'historialPrecios'));
            batch.set(historialCompraRef, {
              productoId: producto.id,
              precioAnterior: producto.precioCompra,
              precioNuevo: nuevoPrecioCompra,
              tipo: 'compra',
              motivo: `Actualización masiva: ${tipo} del ${porcentaje}%`,
              fecha: serverTimestamp(),
              usuario,
              createdAt: serverTimestamp()
            });
          }

          // Actualizar producto
          const productoRef = doc(db, 'productos', producto.id!);
          batch.update(productoRef, {
            precioVenta: nuevoPrecioVenta,
            ...(nuevoPrecioCompra !== undefined && { precioCompra: nuevoPrecioCompra }),
            updatedAt: serverTimestamp(),
            updatedBy: usuario
          });

          actualizados++;
        } catch (error) {
          console.error(`Error actualizando producto ${producto.id}:`, error);
          errores++;
        }
      }

      if (actualizados > 0) {
        await batch.commit();
      }

      return { actualizados, errores };
    } catch (error) {
      console.error('Error al actualizar precios masivos:', error);
      throw error;
    }
  }

  /**
   * Calcular precio sugerido basado en margen de ganancia
   */
  static calcularPrecioSugerido(
    precioCompra: number, 
    margenPorcentaje: number
  ): number {
    return Math.round(precioCompra * (1 + margenPorcentaje / 100));
  }

  /**
   * Calcular margen de ganancia
   */
  static calcularMargenGanancia(precioCompra: number, precioVenta: number): {
    margenPesos: number;
    margenPorcentaje: number;
  } {
    const margenPesos = precioVenta - precioCompra;
    const margenPorcentaje = precioCompra > 0 ? (margenPesos / precioCompra) * 100 : 0;
    
    return {
      margenPesos: Math.round(margenPesos * 100) / 100,
      margenPorcentaje: Math.round(margenPorcentaje * 100) / 100
    };
  }

  /**
   * Obtener historial de precios de un producto
   */
  static async getHistorialPrecios(
    productoId: string,
    limite: number = 50
  ): Promise<HistorialPrecio[]> {
    try {
      const historialRef = collection(db, 'historialPrecios');
      const q = query(
        historialRef,
        where('productoId', '==', productoId),
        orderBy('fecha', 'desc'),
        limit(limite)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...this.convertTimestamps(data as DocumentData)
        } as HistorialPrecio;
      });
    } catch (error) {
      console.error('Error al obtener historial de precios:', error);
      throw error;
    }
  }

  /**
   * Obtener productos con mayor variación de precio
   */
  static async getProductosConMayorVariacion(
    dias: number = 30,
    limite: number = 10
  ): Promise<Array<{
    producto: Producto;
    variacion: number;
    tendencia: 'subida' | 'bajada' | 'estable';
  }>> {
    try {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - dias);

      const historialRef = collection(db, 'historialPrecios');
      const q = query(
        historialRef,
        where('fecha', '>=', fechaLimite),
        orderBy('fecha', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const historial = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...this.convertTimestamps(data as DocumentData)
        } as HistorialPrecio;
      });

      // Agrupar por producto y calcular variación
      const variacionesPorProducto = new Map<string, { 
        precioInicial: number; 
        precioFinal: number; 
        variacion: number;
        tendencia: 'subida' | 'bajada' | 'estable';
      }>();

      for (const registro of historial) {
        const actual = variacionesPorProducto.get(registro.productoId);
        
        if (!actual) {
          variacionesPorProducto.set(registro.productoId, {
            precioInicial: registro.precioAnterior,
            precioFinal: registro.precioNuevo,
            variacion: ((registro.precioNuevo - registro.precioAnterior) / registro.precioAnterior) * 100,
            tendencia: registro.precioNuevo > registro.precioAnterior ? 'subida' : 'bajada'
          });
        } else {
          // Actualizar precio final y recalcular variación
          actual.precioFinal = registro.precioNuevo;
          actual.variacion = ((actual.precioFinal - actual.precioInicial) / actual.precioInicial) * 100;
          actual.tendencia = actual.precioFinal > actual.precioInicial ? 'subida' : 'bajada';
        }
      }

      // Obtener productos y ordenar por variación
      const resultados = [];
      for (const [productoId, variacion] of variacionesPorProducto.entries()) {
        const producto = await ProductosService.getProducto(productoId);
        if (producto) {
          resultados.push({
            producto,
            variacion: Math.round(variacion.variacion * 100) / 100,
            tendencia: variacion.tendencia
          });
        }
      }

      return resultados
        .sort((a, b) => Math.abs(b.variacion) - Math.abs(a.variacion))
        .slice(0, limite);
    } catch (error) {
      console.error('Error al obtener productos con mayor variación:', error);
      throw error;
    }
  }

  /**
   * Analizar competitividad de precios
   */
  static async analizarCompetitividad(): Promise<{
    productosCaros: Array<{ producto: Producto; margen: number }>;
    productosBaratos: Array<{ producto: Producto; margen: number }>;
    promedioMargen: number;
  }> {
    try {
      const productos = await ProductosService.getProductos({ activo: true });
      
      const productosConMargen = productos.map(producto => {
        const margen = this.calcularMargenGanancia(producto.precioCompra, producto.precioVenta);
        return { producto, margen: margen.margenPorcentaje };
      });

      const promedioMargen = productosConMargen.reduce((sum, p) => sum + p.margen, 0) / productosConMargen.length;
      
      // Productos con margen 50% mayor al promedio
      const productosCaros = productosConMargen
        .filter(p => p.margen > promedioMargen * 1.5)
        .sort((a, b) => b.margen - a.margen);

      // Productos con margen 50% menor al promedio
      const productosBaratos = productosConMargen
        .filter(p => p.margen < promedioMargen * 0.5)
        .sort((a, b) => a.margen - b.margen);

      return {
        productosCaros,
        productosBaratos,
        promedioMargen: Math.round(promedioMargen * 100) / 100
      };
    } catch (error) {
      console.error('Error al analizar competitividad:', error);
      throw error;
    }
  }

  /**
   * Obtener configuración de precios
   */
  static async getConfiguracionInventario(): Promise<ConfiguracionInventario | null> {
    try {
      const q = query(collection(db, 'configuracionInventario'), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          ...this.convertTimestamps(doc.data())
        } as ConfiguracionInventario;
      }
      
      return null;
    } catch (error) {
      console.error('Error al obtener configuración:', error);
      throw error;
    }
  }

  /**
   * Actualizar configuración de inventario
   */
  static async actualizarConfiguracionInventario(
    config: Partial<ConfiguracionInventario>
  ): Promise<void> {
    try {
      // Buscar configuración existente
      const q = query(collection(db, 'configuracionInventario'), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Actualizar existente
        const docRef = doc(db, 'configuracionInventario', querySnapshot.docs[0].id);
        await updateDoc(docRef, {
          ...config,
          updatedAt: serverTimestamp()
        });
      } else {
        // Crear nueva configuración
        await addDoc(collection(db, 'configuracionInventario'), {
          alertasStockBajo: true,
          alertasStockAgotado: true,
          alertasVencimiento: false,
          diasAlertaVencimiento: 30,
          permitirVentaSinStock: false,
          actualizarPreciosAutomatico: false,
          margenGananciaDefault: 30,
          moneda: 'ARS',
          codigoBarrasAutomatico: true,
          ubicacionesMultiples: false,
          manejarLotes: false,
          manejarVencimientos: false,
          ...config,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error al actualizar configuración:', error);
      throw error;
    }
  }

  /**
   * Generar reporte de evolución de precios
   */
  static async generarReporteEvolucionPrecios(
    productoId: string,
    fechaInicio: Date,
    fechaFin: Date
  ): Promise<{
    producto: Producto;
    historial: HistorialPrecio[];
    tendencia: 'subida' | 'bajada' | 'estable';
    cambioPromedio: number;
  }> {
    try {
      const producto = await ProductosService.getProducto(productoId);
      if (!producto) {
        throw new Error('Producto no encontrado');
      }

      const historialRef = collection(db, 'historialPrecios');
      const q = query(
        historialRef,
        where('productoId', '==', productoId),
        where('fecha', '>=', fechaInicio),
        where('fecha', '<=', fechaFin),
        orderBy('fecha', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const historial = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...this.convertTimestamps(data as DocumentData)
        } as HistorialPrecio;
      });

      // Calcular tendencia
      let tendencia: 'subida' | 'bajada' | 'estable' = 'estable';
      let cambioPromedio = 0;

      if (historial.length > 1) {
        const cambios = [];
        for (let i = 1; i < historial.length; i++) {
          const cambio = ((historial[i].precioNuevo - historial[i-1].precioNuevo) / historial[i-1].precioNuevo) * 100;
          cambios.push(cambio);
        }
        
        cambioPromedio = cambios.reduce((sum, cambio) => sum + cambio, 0) / cambios.length;
        
        if (cambioPromedio > 5) {
          tendencia = 'subida';
        } else if (cambioPromedio < -5) {
          tendencia = 'bajada';
        }
      }

      return {
        producto,
        historial,
        tendencia,
        cambioPromedio: Math.round(cambioPromedio * 100) / 100
      };
    } catch (error) {
      console.error('Error al generar reporte de evolución de precios:', error);
      throw error;
    }
  }

  /**
   * Obtener precios actuales de productos más vendidos
   */
  static async getPreciosProductosPopulares(limite = 10): Promise<Array<{
    producto: Producto;
    margen: { margenPesos: number; margenPorcentaje: number };
    ventasRecientes: number;
  }>> {
    try {
      // Obtener productos más vendidos (esto requeriría integración con InventarioService)
      const productos = await ProductosService.getProductos({ activo: true });
      
      // Por ahora, ordenamos por stock bajo (asumiendo que son más populares)
      const productosPopulares = productos
        .sort((a, b) => (a.stock / a.stockMinimo) - (b.stock / b.stockMinimo))
        .slice(0, limite);

      return productosPopulares.map(producto => ({
        producto,
        margen: this.calcularMargenGanancia(producto.precioCompra, producto.precioVenta),
        ventasRecientes: 0 // Se podría calcular con datos reales de ventas
      }));
    } catch (error) {
      console.error('Error al obtener precios de productos populares:', error);
      throw error;
    }
  }

  // ============================================
  // UTILIDADES
  // ============================================

  private static convertTimestamps<T = unknown>(data: T): T extends Timestamp
    ? Date
    : T extends (infer U)[]
      ? ReturnType<typeof this.convertTimestamps<U>>[]
      : T extends Record<string, unknown>
        ? { [K in keyof T]: ReturnType<typeof this.convertTimestamps<T[K]>> }
        : T {
    if (data instanceof Timestamp) {
      return data.toDate() as ReturnType<typeof this.convertTimestamps<T>>;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.convertTimestamps(item)) as ReturnType<typeof this.convertTimestamps<T>>;
    }

    if (data && typeof data === 'object') {
      const converted: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        converted[key] = this.convertTimestamps(value);
      }
      return converted as ReturnType<typeof this.convertTimestamps<T>>;
    }

    return data as ReturnType<typeof this.convertTimestamps<T>>;
  }

  /**
   * Formatear precio con moneda
   */
  static formatearPrecio(precio: number, moneda: string = 'ARS'): string {
    const simbolos: { [key: string]: string } = {
      'ARS': '$',
      'USD': 'US$',
      'EUR': '€'
    };

    const simbolo = simbolos[moneda] || '$';
    return `${simbolo}${precio.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }

  /**
   * Validar precio
   */
  static validarPrecio(precio: number): { valido: boolean; error?: string } {
    if (precio < 0) {
      return { valido: false, error: 'El precio no puede ser negativo' };
    }
    
    if (precio > 1000000) {
      return { valido: false, error: 'El precio es demasiado alto' };
    }
    
    return { valido: true };
  }
}
