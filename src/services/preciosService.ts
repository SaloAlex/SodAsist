import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
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
    filtros: {
      categoria?: string;
      proveedor?: string;
      productos?: string[];
    },
    porcentajeAumento: number,
    tipo: 'venta' | 'compra' | 'ambos' = 'venta',
    motivo: string = 'Actualización masiva',
    usuario: string = 'sistema'
  ): Promise<{
    actualizados: number;
    errores: { productoId: string; error: string }[];
  }> {
    try {
      let productos: Producto[] = [];

      if (filtros.productos && filtros.productos.length > 0) {
        // Obtener productos específicos
        for (const id of filtros.productos) {
          const producto = await ProductosService.getProducto(id);
          if (producto) productos.push(producto);
        }
      } else {
        // Obtener productos por filtros
        productos = await ProductosService.getProductos({
          categoria: filtros.categoria,
          proveedor: filtros.proveedor,
          activo: true
        });
      }

      const errores: { productoId: string; error: string }[] = [];
      let actualizados = 0;

      // Procesar productos en lotes para evitar límites de Firestore
      const BATCH_SIZE = 10;
      for (let i = 0; i < productos.length; i += BATCH_SIZE) {
        const lote = productos.slice(i, i + BATCH_SIZE);
        
        for (const producto of lote) {
          try {
            const factor = 1 + (porcentajeAumento / 100);
            
            let nuevoPrecioVenta = producto.precioVenta;
            let nuevoPrecioCompra = producto.precioCompra;

            if (tipo === 'venta' || tipo === 'ambos') {
              nuevoPrecioVenta = Math.round(producto.precioVenta * factor);
            }
            
            if (tipo === 'compra' || tipo === 'ambos') {
              nuevoPrecioCompra = Math.round(producto.precioCompra * factor);
            }

            await this.actualizarPrecio(
              producto.id,
              nuevoPrecioVenta,
              tipo === 'compra' || tipo === 'ambos' ? nuevoPrecioCompra : undefined,
              `${motivo} (${porcentajeAumento > 0 ? '+' : ''}${porcentajeAumento}%)`,
              usuario
            );

            actualizados++;
          } catch (error) {
            errores.push({
              productoId: producto.id,
              error: error instanceof Error ? error.message : 'Error desconocido'
            });
          }
        }
      }

      return { actualizados, errores };
    } catch (error) {
      console.error('Error en actualización masiva de precios:', error);
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
    tipo?: 'venta' | 'compra',
    limite = 50
  ): Promise<HistorialPrecio[]> {
    try {
      const constraints = [
        where('productoId', '==', productoId),
        orderBy('fecha', 'desc'),
        limit(limite)
      ];

      if (tipo) {
        constraints.splice(1, 0, where('tipo', '==', tipo));
      }

      const q = query(collection(db, 'historialPrecios'), ...constraints);
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertTimestamps(doc.data())
      })) as HistorialPrecio[];
    } catch (error) {
      console.error('Error al obtener historial de precios:', error);
      throw error;
    }
  }

  /**
   * Obtener productos con márgenes bajos
   */
  static async getProductosMargenBajo(
    margenMinimo: number = 20
  ): Promise<Array<Producto & { margenActual: number }>> {
    try {
      const productos = await ProductosService.getProductos({ activo: true });
      
      return productos
        .map(producto => {
          const margen = this.calcularMargenGanancia(producto.precioCompra, producto.precioVenta);
          return {
            ...producto,
            margenActual: margen.margenPorcentaje
          };
        })
        .filter(producto => producto.margenActual < margenMinimo)
        .sort((a, b) => a.margenActual - b.margenActual);
    } catch (error) {
      console.error('Error al obtener productos con margen bajo:', error);
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
    diasAtras: number = 90
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

      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - diasAtras);

      const q = query(
        collection(db, 'historialPrecios'),
        where('productoId', '==', productoId),
        where('fecha', '>=', Timestamp.fromDate(fechaInicio)),
        orderBy('fecha', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const historial = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertTimestamps(doc.data())
      })) as HistorialPrecio[];

      // Calcular tendencia
      let tendencia: 'subida' | 'bajada' | 'estable' = 'estable';
      let cambioPromedio = 0;

      if (historial.length > 1) {
        const precioInicial = historial[0].precioAnterior;
        const precioFinal = historial[historial.length - 1].precioNuevo;
        cambioPromedio = ((precioFinal - precioInicial) / precioInicial) * 100;

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
