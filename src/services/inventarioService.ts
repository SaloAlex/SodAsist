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
  runTransaction,
  serverTimestamp,
  Timestamp,
  DocumentData
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import {
  MovimientoInventario,
  AjusteInventario,
  InventarioVehiculoDinamico,
  ReporteInventario,
  MetricasInventario,
  FiltrosMovimientos,
  TipoMovimiento,
  ValidacionStock,
  ResultadoTransaccion,
  Producto
} from '../types';
import { ProductosService } from './productosService';

export class InventarioService {

  /**
   * Obtener la ruta del tenant del usuario actual
   */
  private static getTenantPath(collectionName: string): string {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('Usuario no autenticado o sin email');
    }
    return `tenants/${user.email}/${collectionName}`;
  }

  /**
   * Obtener la ruta del tenant para movimientos de inventario
   */
  private static getMovimientosPath(): string {
    return this.getTenantPath('movimientosInventario');
  }

  /**
   * Obtener la ruta del tenant para ajustes de inventario
   */
  private static getAjustesPath(): string {
    return this.getTenantPath('ajustesInventario');
  }

  /**
   * Obtener la ruta del tenant para inventario vehicular
   */
  private static getInventarioVehicularPath(): string {
    return this.getTenantPath('inventarioVehiculo');
  }

  /**
   * Registrar movimiento de inventario
   */
  static async registrarMovimiento(
    productoId: string,
    tipo: TipoMovimiento,
    cantidad: number,
    motivo: string,
    usuario: string,
    referencia?: string,
    observaciones?: string
  ): Promise<string> {
    try {
      const batch = writeBatch(db);
      
      // Obtener producto actual
      const producto = await ProductosService.getProducto(productoId);
      if (!producto) {
        throw new Error('Producto no encontrado');
      }

      // Calcular nueva cantidad según el tipo de movimiento
      let nuevaCantidad = producto.stock;
      const cantidadMovimiento = Math.abs(cantidad);

      switch (tipo) {
        case TipoMovimiento.ENTRADA:
        case TipoMovimiento.DEVOLUCION:
          nuevaCantidad += cantidadMovimiento;
          break;
        case TipoMovimiento.SALIDA:
        case TipoMovimiento.VENTA:
        case TipoMovimiento.MERMA:
          nuevaCantidad = Math.max(0, nuevaCantidad - cantidadMovimiento);
          break;
        case TipoMovimiento.AJUSTE:
          nuevaCantidad = cantidadMovimiento;
          break;
        case TipoMovimiento.TRANSFERENCIA:
          // Para transferencias, la cantidad puede ser negativa o positiva
          nuevaCantidad += cantidad;
          nuevaCantidad = Math.max(0, nuevaCantidad);
          break;
        case TipoMovimiento.INICIAL:
          nuevaCantidad = cantidadMovimiento;
          break;
      }

      // Actualizar stock del producto
      const productoRef = doc(db, this.getTenantPath('productos'), productoId);
      batch.update(productoRef, {
        stock: nuevaCantidad,
        updatedAt: serverTimestamp()
      });

      // Crear movimiento
      const movimientoRef = doc(collection(db, this.getMovimientosPath()));
      const movimientoData = {
        productoId,
        tipo,
        cantidad: cantidadMovimiento,
        cantidadAnterior: producto.stock,
        cantidadNueva: nuevaCantidad,
        motivo,
        referencia,
        observaciones,
        fecha: serverTimestamp(),
        usuario,
        createdAt: serverTimestamp()
      };

      batch.set(movimientoRef, movimientoData);

      await batch.commit();
      return movimientoRef.id;
    } catch (error) {
      console.error('Error al registrar movimiento:', error);
      throw error;
    }
  }

  /**
   * Validar movimiento de stock antes de ejecutarlo
   */
  private static validarMovimientoStock(validacion: ValidacionStock): { valido: boolean; errores: string[] } {
    const errores: string[] = [];
    const { stockActual, stockMinimo, stockMaximo, cantidadMovimiento, tipoMovimiento } = validacion;

    // Validaciones básicas
    if (cantidadMovimiento <= 0) {
      errores.push('La cantidad debe ser mayor a 0');
    }

    if (stockActual < 0) {
      errores.push('El stock actual no puede ser negativo');
    }

    // Validaciones específicas por tipo de movimiento
    switch (tipoMovimiento) {
      case TipoMovimiento.SALIDA:
      case TipoMovimiento.VENTA:
      case TipoMovimiento.MERMA:
        if (cantidadMovimiento > stockActual) {
          errores.push(`Stock insuficiente. Disponible: ${stockActual}, Solicitado: ${cantidadMovimiento}`);
        }
        break;

      case TipoMovimiento.AJUSTE:
        if (cantidadMovimiento < 0) {
          errores.push('El stock ajustado no puede ser negativo');
        }
        break;

      case TipoMovimiento.ENTRADA:
      case TipoMovimiento.DEVOLUCION:
        // Validar límite máximo si está definido
        if (stockMaximo && (stockActual + cantidadMovimiento) > stockMaximo) {
          errores.push(`El stock excedería el máximo permitido (${stockMaximo})`);
        }
        break;
    }

    // Validación de stock mínimo
    const stockResultante = this.calcularStockResultante(stockActual, cantidadMovimiento, tipoMovimiento);
    if (stockResultante < stockMinimo && tipoMovimiento !== TipoMovimiento.ENTRADA) {
      errores.push(`El stock resultante (${stockResultante}) estaría por debajo del mínimo (${stockMinimo})`);
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }

  /**
   * Calcular el stock resultante después de un movimiento
   */
  private static calcularStockResultante(stockActual: number, cantidad: number, tipo: TipoMovimiento): number {
    switch (tipo) {
      case TipoMovimiento.ENTRADA:
      case TipoMovimiento.DEVOLUCION:
        return stockActual + cantidad;
      case TipoMovimiento.SALIDA:
      case TipoMovimiento.VENTA:
      case TipoMovimiento.MERMA:
        return Math.max(0, stockActual - cantidad);
      case TipoMovimiento.AJUSTE:
        return cantidad;
      case TipoMovimiento.TRANSFERENCIA:
        return Math.max(0, stockActual + cantidad);
      case TipoMovimiento.INICIAL:
        return cantidad;
      default:
        return stockActual;
    }
  }

  /**
   * Registrar movimiento con transacción atómica y validaciones
   */
  static async registrarMovimientoAtomico(
    productoId: string,
    tipo: TipoMovimiento,
    cantidad: number,
    motivo: string,
    usuario: string,
    referencia?: string,
    observaciones?: string
  ): Promise<ResultadoTransaccion> {
    try {
      const resultado = await runTransaction(db, async (transaction) => {
        // Obtener producto actual dentro de la transacción
        const user = auth.currentUser;
        if (!user || !user.email) throw new Error('Usuario no autenticado o sin email');
        const productoRef = doc(db, `tenants/${user.email}/productos`, productoId);
        const productoDoc = await transaction.get(productoRef);
        
        if (!productoDoc.exists()) {
          throw new Error('Producto no encontrado');
        }

        const producto = productoDoc.data() as Producto;
        const stockActual = producto.stock;
        const cantidadMovimiento = Math.abs(cantidad);

        // Crear validación
        const validacion: ValidacionStock = {
          productoId,
          stockActual,
          stockMinimo: producto.stockMinimo,
          stockMaximo: producto.stockMaximo,
          cantidadMovimiento,
          tipoMovimiento: tipo
        };

        // Validar movimiento
        const { valido, errores } = this.validarMovimientoStock(validacion);
        if (!valido) {
          return {
            exito: false,
            stockAnterior: stockActual,
            stockNuevo: stockActual,
            mensaje: 'Validación fallida',
            errores
          };
        }

        // Calcular nueva cantidad
        const stockNuevo = this.calcularStockResultante(stockActual, cantidad, tipo);

        // Actualizar producto
        transaction.update(productoRef, {
          stock: stockNuevo,
          updatedAt: serverTimestamp(),
          updatedBy: usuario
        });

        // Crear movimiento
        const movimientoRef = doc(collection(db, this.getMovimientosPath()));
        const movimientoData = {
          productoId,
          tipo,
          cantidad: cantidadMovimiento,
          stockAnterior: stockActual,
          stockNuevo,
          motivo,
          usuario,
          referencia,
          observaciones,
          fecha: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        transaction.set(movimientoRef, movimientoData);

        return {
          exito: true,
          movimientoId: movimientoRef.id,
          stockAnterior: stockActual,
          stockNuevo,
          mensaje: 'Movimiento registrado exitosamente'
        };
      });

      return resultado;
    } catch (error) {
      console.error('Error en transacción atómica:', error);
      return {
        exito: false,
        stockAnterior: 0,
        stockNuevo: 0,
        mensaje: 'Error en la transacción',
        errores: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }

  /**
   * Registrar múltiples movimientos en una sola transacción
   */
  static async registrarMovimientosMultiples(
    movimientos: Array<{
      productoId: string;
      tipo: TipoMovimiento;
      cantidad: number;
      motivo: string;
    }>,
    usuario: string,
    referencia?: string
  ): Promise<ResultadoTransaccion[]> {
    try {
      const resultados: ResultadoTransaccion[] = [];

      await runTransaction(db, async (transaction) => {
        // Validar todos los movimientos primero
        const user = auth.currentUser;
        if (!user || !user.email) throw new Error('Usuario no autenticado o sin email');
        
        for (const mov of movimientos) {
          const productoRef = doc(db, `tenants/${user.email}/productos`, mov.productoId);
          const productoDoc = await transaction.get(productoRef);
          
          if (!productoDoc.exists()) {
            resultados.push({
              exito: false,
              stockAnterior: 0,
              stockNuevo: 0,
              mensaje: `Producto ${mov.productoId} no encontrado`,
              errores: ['Producto no encontrado']
            });
            continue;
          }

          const producto = productoDoc.data() as Producto;
          const validacion: ValidacionStock = {
            productoId: mov.productoId,
            stockActual: producto.stock,
            stockMinimo: producto.stockMinimo,
            stockMaximo: producto.stockMaximo,
            cantidadMovimiento: Math.abs(mov.cantidad),
            tipoMovimiento: mov.tipo
          };

          const { valido, errores } = this.validarMovimientoStock(validacion);
          if (!valido) {
            resultados.push({
              exito: false,
              stockAnterior: producto.stock,
              stockNuevo: producto.stock,
              mensaje: 'Validación fallida',
              errores
            });
            continue;
          }

          // Si llegamos aquí, el movimiento es válido
          const stockNuevo = this.calcularStockResultante(producto.stock, mov.cantidad, mov.tipo);
          
          // Actualizar producto
          transaction.update(productoRef, {
            stock: stockNuevo,
            updatedAt: serverTimestamp(),
            updatedBy: usuario
          });

          // Crear movimiento
          const movimientoRef = doc(collection(db, this.getMovimientosPath()));
          const movimientoData = {
            productoId: mov.productoId,
            tipo: mov.tipo,
            cantidad: Math.abs(mov.cantidad),
            stockAnterior: producto.stock,
            stockNuevo,
            motivo: mov.motivo,
            usuario,
            referencia,
            fecha: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };

          transaction.set(movimientoRef, movimientoData);

          resultados.push({
            exito: true,
            movimientoId: movimientoRef.id,
            stockAnterior: producto.stock,
            stockNuevo,
            mensaje: 'Movimiento registrado exitosamente'
          });
        }
      });

      return resultados;
    } catch (error) {
      console.error('Error en transacción múltiple:', error);
      return movimientos.map(() => ({
        exito: false,
        stockAnterior: 0,
        stockNuevo: 0,
        mensaje: 'Error en la transacción',
        errores: [error instanceof Error ? error.message : 'Error desconocido']
      }));
    }
  }

  /**
   * Obtener movimientos con filtros
   */
  static async getMovimientos(filtros?: FiltrosMovimientos, limite = 50): Promise<MovimientoInventario[]> {
    try {
      let q: ReturnType<typeof collection> | ReturnType<typeof query> = collection(db, this.getMovimientosPath());
      const constraints = [];

      // Aplicar filtros
      if (filtros?.productoId) {
        constraints.push(where('productoId', '==', filtros.productoId));
      }
      
      if (filtros?.tipo) {
        constraints.push(where('tipo', '==', filtros.tipo));
      }
      
      if (filtros?.usuario) {
        constraints.push(where('usuario', '==', filtros.usuario));
      }
      
      if (filtros?.referencia) {
        constraints.push(where('referencia', '==', filtros.referencia));
      }

      if (filtros?.fechaDesde) {
        constraints.push(where('fecha', '>=', Timestamp.fromDate(filtros.fechaDesde)));
      }
      
      if (filtros?.fechaHasta) {
        constraints.push(where('fecha', '<=', Timestamp.fromDate(filtros.fechaHasta)));
      }

      // Ordenar por fecha descendente
      constraints.push(orderBy('fecha', 'desc'));
      constraints.push(limit(limite));

      if (constraints.length > 0) {
        q = query(collection(db, this.getMovimientosPath()), ...constraints);
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        const convertedData = this.convertTimestamps(data as DocumentData) as Omit<MovimientoInventario, 'id'>;
        return {
          id: doc.id,
          ...convertedData
        } as MovimientoInventario;
      });
    } catch (error) {
      console.error('Error al obtener movimientos:', error);
      throw error;
    }
  }

  /**
   * Crear ajuste de inventario
   */
  static async crearAjusteInventario(
    ajuste: Omit<AjusteInventario, 'id' | 'createdAt' | 'updatedAt' | 'estado'>
  ): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.getAjustesPath()), {
        ...ajuste,
        estado: 'pendiente',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error al crear ajuste de inventario:', error);
      throw error;
    }
  }

  /**
   * Aprobar ajuste de inventario
   */
  static async aprobarAjusteInventario(ajusteId: string, aprobadoPor: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Obtener ajuste
      const ajusteRef = doc(db, this.getAjustesPath(), ajusteId);
      const ajusteDoc = await getDoc(ajusteRef);
      
      if (!ajusteDoc.exists()) {
        throw new Error('Ajuste no encontrado');
      }

      const ajuste = { id: ajusteDoc.id, ...ajusteDoc.data() } as AjusteInventario;
      
      if (ajuste.estado !== 'pendiente') {
        throw new Error('El ajuste ya fue procesado');
      }

      // Procesar cada producto del ajuste
      for (const productoAjuste of ajuste.productos) {
        const producto = await ProductosService.getProducto(productoAjuste.productoId);
        if (!producto) {
          throw new Error(`Producto ${productoAjuste.productoId} no encontrado`);
        }

        // Actualizar stock del producto
        const productoRef = doc(db, 'productos', productoAjuste.productoId);
        batch.update(productoRef, {
          stock: productoAjuste.cantidadNueva,
          updatedAt: serverTimestamp()
        });

        // Crear movimiento de ajuste
        const movimientoRef = doc(collection(db, this.getMovimientosPath()));
        batch.set(movimientoRef, {
          productoId: productoAjuste.productoId,
          tipo: TipoMovimiento.AJUSTE,
          cantidad: Math.abs(productoAjuste.diferencia),
          cantidadAnterior: productoAjuste.cantidadAnterior,
          cantidadNueva: productoAjuste.cantidadNueva,
          motivo: `Ajuste de inventario: ${ajuste.motivo}`,
          referencia: ajusteId,
          observaciones: productoAjuste.motivo || ajuste.observaciones,
          fecha: serverTimestamp(),
          usuario: aprobadoPor,
          createdAt: serverTimestamp()
        });
      }

      // Actualizar estado del ajuste
      batch.update(ajusteRef, {
        estado: 'aprobado',
        aprobadoPor,
        fechaAprobacion: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await batch.commit();
    } catch (error) {
      console.error('Error al aprobar ajuste:', error);
      throw error;
    }
  }

  /**
   * Procesar venta (reducir stock de múltiples productos)
   */
  static async procesarVenta(
    productos: { productoId: string; cantidad: number; precioUnitario: number }[],
    referencia: string,
    usuario: string
  ): Promise<void> {
    try {
      const batch = writeBatch(db);

      for (const item of productos) {
        const producto = await ProductosService.getProducto(item.productoId);
        if (!producto) {
          throw new Error(`Producto ${item.productoId} no encontrado`);
        }

        if (producto.stock < item.cantidad) {
          throw new Error(`Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}, Solicitado: ${item.cantidad}`);
        }

        const nuevaCantidad = producto.stock - item.cantidad;

        // Actualizar stock del producto
        const productoRef = doc(db, 'productos', item.productoId);
        batch.update(productoRef, {
          stock: nuevaCantidad,
          updatedAt: serverTimestamp()
        });

        // Crear movimiento de venta
        const movimientoRef = doc(collection(db, this.getMovimientosPath()));
        batch.set(movimientoRef, {
          productoId: item.productoId,
          tipo: TipoMovimiento.VENTA,
          cantidad: item.cantidad,
          cantidadAnterior: producto.stock,
          cantidadNueva: nuevaCantidad,
          motivo: 'Venta a cliente',
          referencia,
          fecha: serverTimestamp(),
          usuario,
          createdAt: serverTimestamp()
        });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error al procesar venta:', error);
      throw error;
    }
  }

  /**
   * Procesar devolución (aumentar stock de múltiples productos)
   */
  static async procesarDevolucion(
    productos: { productoId: string; cantidad: number }[],
    referencia: string,
    usuario: string,
    motivo: string = 'Devolución de cliente'
  ): Promise<void> {
    try {
      const batch = writeBatch(db);

      for (const item of productos) {
        const producto = await ProductosService.getProducto(item.productoId);
        if (!producto) {
          throw new Error(`Producto ${item.productoId} no encontrado`);
        }

        const nuevaCantidad = producto.stock + item.cantidad;

        // Actualizar stock del producto
        const productoRef = doc(db, 'productos', item.productoId);
        batch.update(productoRef, {
          stock: nuevaCantidad,
          updatedAt: serverTimestamp()
        });

        // Crear movimiento de devolución
        const movimientoRef = doc(collection(db, this.getMovimientosPath()));
        batch.set(movimientoRef, {
          productoId: item.productoId,
          tipo: TipoMovimiento.DEVOLUCION,
          cantidad: item.cantidad,
          cantidadAnterior: producto.stock,
          cantidadNueva: nuevaCantidad,
          motivo,
          referencia,
          fecha: serverTimestamp(),
          usuario,
          createdAt: serverTimestamp()
        });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error al procesar devolución:', error);
      throw error;
    }
  }

  // ============================================
  // INVENTARIO VEHICULAR DINÁMICO
  // ============================================

  /**
   * Crear inventario vehicular
   */
  static async crearInventarioVehicular(
    inventario: Omit<InventarioVehiculoDinamico, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.getInventarioVehicularPath()), {
        ...inventario,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error al crear inventario vehicular:', error);
      throw error;
    }
  }

  /**
   * Obtener inventario vehicular actual
   */
  static async getInventarioVehicularActual(conductor?: string): Promise<InventarioVehiculoDinamico | null> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const constraints = [
        where('fecha', '>=', Timestamp.fromDate(today)),
        orderBy('fecha', 'desc'),
        limit(1)
      ];

      if (conductor) {
        constraints.unshift(where('conductor', '==', conductor));
      }

      const q = query(collection(db, this.getInventarioVehicularPath()), ...constraints);
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        const convertedData = this.convertTimestamps(data);
        return {
          id: doc.id,
          ...convertedData
        } as InventarioVehiculoDinamico;
      }

      return null;
    } catch (error) {
      console.error('Error al obtener inventario vehicular:', error);
      throw error;
    }
  }

  /**
   * Actualizar inventario vehicular
   */
  static async actualizarInventarioVehicular(
    id: string,
    productos: { productoId: string; cantidad: number }[]
  ): Promise<void> {
    try {
      const docRef = doc(db, this.getInventarioVehicularPath(), id);
      await updateDoc(docRef, {
        productos,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error al actualizar inventario vehicular:', error);
      throw error;
    }
  }

  // ============================================
  // REPORTES Y MÉTRICAS
  // ============================================

  /**
   * Generar reporte de inventario
   */
  static async generarReporteInventario(fecha?: Date): Promise<ReporteInventario> {
    try {
      const fechaReporte = fecha || new Date();
      const inicioDelDia = new Date(fechaReporte);
      inicioDelDia.setHours(0, 0, 0, 0);
      const finDelDia = new Date(fechaReporte);
      finDelDia.setHours(23, 59, 59, 999);

      // Obtener todos los productos activos
      const productos = await ProductosService.getProductos({ activo: true });
      
      // Obtener movimientos del día
      const movimientosHoy = await this.getMovimientos({
        fechaDesde: inicioDelDia,
        fechaHasta: finDelDia
      });

      // Calcular métricas
      const valorTotalInventario = productos.reduce((total, p) => 
        total + (p.stock * p.precioCompra), 0
      );

      const productosConStockBajo = productos.filter(p => p.stock <= p.stockMinimo).length;
      const productosAgotados = productos.filter(p => p.stock === 0).length;
      
      const ventasDelDia = movimientosHoy.filter(m => m.tipo === TipoMovimiento.VENTA).length;
      const comprasDelDia = movimientosHoy.filter(m => m.tipo === TipoMovimiento.ENTRADA).length;

      // Preparar datos de productos para el reporte
      const productosReporte = productos.map(p => ({
        id: p.id,
        nombre: p.nombre,
        categoria: p.categoria,
        stock: p.stock,
        stockMinimo: p.stockMinimo,
        valor: p.stock * p.precioCompra,
        rotacion: this.calcularRotacionProducto(p.id, movimientosHoy),
        diasSinMovimiento: this.calcularDiasSinMovimiento(p.id, movimientosHoy)
      }));

      return {
        fecha: fechaReporte,
        valorTotalInventario,
        productosConStockBajo,
        productosAgotados,
        movimientosDelDia: movimientosHoy.length,
        ventasDelDia,
        comprasDelDia,
        productos: productosReporte
      };
    } catch (error) {
      console.error('Error al generar reporte de inventario:', error);
      throw error;
    }
  }

  /**
   * Obtener métricas generales del inventario
   */
  static async getMetricasInventario(): Promise<MetricasInventario> {
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      // Obtener productos y categorías
      const productos = await ProductosService.getProductos();
      const categorias = await ProductosService.getCategorias();
      
      // Obtener movimientos de hoy
      const movimientosHoy = await this.getMovimientos({
        fechaDesde: hoy
      });

      const productosActivos = productos.filter(p => p.activo);
      const valorTotal = productosActivos.reduce((total, p) => 
        total + (p.stock * p.precioCompra), 0
      );

      return {
        valorTotal,
        cantidadProductos: productos.length,
        productosActivos: productosActivos.length,
        productosConStockBajo: productosActivos.filter(p => p.stock <= p.stockMinimo).length,
        productosAgotados: productosActivos.filter(p => p.stock === 0).length,
        categorias: categorias.length,
        movimientosHoy: movimientosHoy.length,
        ventasHoy: movimientosHoy.filter(m => m.tipo === TipoMovimiento.VENTA).length
      };
    } catch (error) {
      console.error('Error al obtener métricas de inventario:', error);
      throw error;
    }
  }

  /**
   * Obtener productos más vendidos
   */
  static async getProductosMasVendidos(dias = 30, limite = 10): Promise<{
    productoId: string;
    nombre: string;
    cantidadVendida: number;
    ingresos: number;
  }[]> {
    try {
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - dias);

      const movimientos = await this.getMovimientos({
        tipo: TipoMovimiento.VENTA,
        fechaDesde: fechaInicio
      });

      // Agrupar por producto
      const ventasPorProducto = new Map<string, { cantidad: number; ingresos: number }>();

      for (const movimiento of movimientos) {
        const actual = ventasPorProducto.get(movimiento.productoId) || { cantidad: 0, ingresos: 0 };
        actual.cantidad += movimiento.cantidad;
        
        // Obtener precio del producto para calcular ingresos
        const producto = await ProductosService.getProducto(movimiento.productoId);
        if (producto) {
          actual.ingresos += movimiento.cantidad * producto.precioVenta;
        }
        
        ventasPorProducto.set(movimiento.productoId, actual);
      }

      // Convertir a array y ordenar
      const resultados = [];
      const ventasArray = Array.from(ventasPorProducto.entries());
      for (const [productoId, datos] of ventasArray) {
        const producto = await ProductosService.getProducto(productoId);
        if (producto) {
          resultados.push({
            productoId,
            nombre: producto.nombre,
            cantidadVendida: datos.cantidad,
            ingresos: datos.ingresos
          });
        }
      }

      return resultados
        .sort((a, b) => b.cantidadVendida - a.cantidadVendida)
        .slice(0, limite);
    } catch (error) {
      console.error('Error al obtener productos más vendidos:', error);
      throw error;
    }
  }

  // ============================================
  // UTILIDADES PRIVADAS
  // ============================================

  private static calcularRotacionProducto(productoId: string, movimientos: MovimientoInventario[]): number {
    const ventasProducto = movimientos.filter(m => 
      m.productoId === productoId && m.tipo === TipoMovimiento.VENTA
    );
    
    return ventasProducto.reduce((total, m) => total + m.cantidad, 0);
  }

  private static calcularDiasSinMovimiento(productoId: string, movimientos: MovimientoInventario[]): number {
    const movimientosProducto = movimientos.filter(m => m.productoId === productoId);
    
    if (movimientosProducto.length === 0) {
      return 999; // Valor alto para productos sin movimientos
    }

    const ultimoMovimiento = movimientosProducto.sort((a, b) => 
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    )[0];

    const hoy = new Date();
    const fechaUltimoMovimiento = new Date(ultimoMovimiento.fecha);
    const diferencia = hoy.getTime() - fechaUltimoMovimiento.getTime();
    
    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
  }

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
}
