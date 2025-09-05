import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

// Enum para tipos de movimiento
enum TipoMovimiento {
  ENTRADA = 'entrada',
  SALIDA = 'salida',
  VENTA = 'venta',
  AJUSTE = 'ajuste',
  TRANSFERENCIA = 'transferencia',
  MERMA = 'merma',
  DEVOLUCION = 'devolucion',
  INICIAL = 'inicial'
}

// Función para registrar movimiento de inventario
async function registrarMovimiento(
  db: admin.firestore.Firestore,
  tenantId: string,
  productoId: string,
  tipo: TipoMovimiento,
  cantidad: number,
  motivo: string,
  usuario: string,
  referencia?: string,
  observaciones?: string
): Promise<void> {
  try {
    const movimientosRef = db.collection(`tenants/${tenantId}/movimientosInventario`);
    
    await movimientosRef.add({
      productoId,
      tipo,
      cantidad: Math.abs(cantidad),
      motivo,
      referencia,
      observaciones,
      fecha: admin.firestore.FieldValue.serverTimestamp(),
      usuario,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Movimiento registrado: ${tipo} - ${cantidad} unidades de ${productoId}`);
  } catch (error) {
    console.error('❌ Error al registrar movimiento:', error);
  }
}

export const onEntregaCreate = onDocumentCreated('tenants/{tenantId}/entregas/{entregaId}', async (event) => {
    const entrega = event.data?.data();
    const db = admin.firestore();
    const tenantId = event.params.tenantId;
    
    if (!entrega) {
      console.error('❌ No se encontraron datos de la entrega');
      return;
    }
    
    try {
      console.log('🚀 Trigger onEntregaCreate ejecutado para tenant:', tenantId);
      console.log('📦 Datos de la entrega:', entrega);
      
      // Update client with last delivery data
      const clienteRef = db.collection(`tenants/${tenantId}/clientes`).doc(entrega.clienteId);
      const clienteDoc = await clienteRef.get();
      
      if (clienteDoc.exists) {
        const clienteData = clienteDoc.data();
        let nuevoSaldo = clienteData?.saldoPendiente || 0;
        
        // Handle balance logic
        if (entrega.pagado) {
          // If paid, reduce previous pending balance
          nuevoSaldo = Math.max(0, nuevoSaldo - entrega.total);
        } else {
          // If not paid, add to pending balance
          nuevoSaldo = nuevoSaldo + entrega.total;
        }
        
        // Update client with all last delivery data
        await clienteRef.update({
          // Last delivery data
          bidones10: entrega.bidones10 || 0,
          bidones20: entrega.bidones20 || 0,
          sodas: entrega.sodas || 0,
          envasesDevueltos: entrega.envasesDevueltos || 0,
          total: entrega.total || 0,
          pagado: entrega.pagado || false,
          // Updated balance
          saldoPendiente: nuevoSaldo,
          // Update timestamp
          updatedAt: new Date()
        });
        
        console.log('✅ Cliente actualizado exitosamente');
      }
      
      // Update vehicle inventory - usar la misma estructura que el frontend
      const inventoryRef = db.collection(`tenants/${tenantId}/inventarioVehiculo`).doc('actual');
      const inventoryDoc = await inventoryRef.get();
      
      if (inventoryDoc.exists) {
        const inventoryData = inventoryDoc.data();
        console.log('📊 Inventario actual del vehículo:', inventoryData);
        
        // Calcular nuevo stock basado en los productos entregados
        const nuevoStock = { ...inventoryData };
        
        // Array para almacenar promesas de movimientos
        const movimientosPromises: Promise<void>[] = [];
        
        // Si la entrega tiene productos dinámicos, usarlos
        if (entrega.productos && Array.isArray(entrega.productos)) {
          console.log('🔄 Procesando productos dinámicos:', entrega.productos);
          
          entrega.productos.forEach((producto: { id?: string; nombre: string; cantidad: number }) => {
            const nombre = producto.nombre?.toLowerCase() || '';
            console.log(`📦 Procesando: ${producto.nombre} (${producto.cantidad} unidades)`);
            
            // Registrar movimiento de venta del vehículo
            if (producto.id) {
              movimientosPromises.push(
                registrarMovimiento(
                  db,
                  tenantId,
                  producto.id,
                  TipoMovimiento.VENTA,
                  producto.cantidad,
                  'Entrega a cliente',
                  entrega.usuario || 'sistema',
                  entrega.id || 'entrega',
                  `Venta a cliente: ${producto.nombre} - ${producto.cantidad} unidades`
                )
              );
            }
            
            if (nombre.includes('soda') || nombre.includes('gaseosa')) {
              const stockAnterior = nuevoStock.sodas || 0;
              nuevoStock.sodas = Math.max(0, stockAnterior - producto.cantidad);
              console.log(`🥤 Soda: ${stockAnterior} → ${nuevoStock.sodas}`);
            } else if (nombre.includes('10') || (nombre.includes('bidón') && !nombre.includes('20'))) {
              const stockAnterior = nuevoStock.bidones10 || 0;
              nuevoStock.bidones10 = Math.max(0, stockAnterior - producto.cantidad);
              console.log(`🪣 Bidón 10L: ${stockAnterior} → ${nuevoStock.bidones10}`);
            } else if (nombre.includes('20')) {
              const stockAnterior = nuevoStock.bidones20 || 0;
              nuevoStock.bidones20 = Math.max(0, stockAnterior - producto.cantidad);
              console.log(`🪣 Bidón 20L: ${stockAnterior} → ${nuevoStock.bidones20}`);
            }
          });
        } else {
          // Fallback a campos legacy si no hay productos dinámicos
          console.log('🔄 Procesando campos legacy');
          nuevoStock.sodas = Math.max(0, (nuevoStock.sodas || 0) - (entrega.sodas || 0));
          nuevoStock.bidones10 = Math.max(0, (nuevoStock.bidones10 || 0) - (entrega.bidones10 || 0));
          nuevoStock.bidones20 = Math.max(0, (nuevoStock.bidones20 || 0) - (entrega.bidones20 || 0));
        }
        
        console.log('📊 Nuevo inventario calculado:', nuevoStock);
        
        await inventoryRef.update({
          ...nuevoStock,
          updatedAt: new Date()
        });
        
        console.log('✅ Inventario del vehículo actualizado exitosamente');
        
        // Registrar todos los movimientos
        await Promise.all(movimientosPromises);
        console.log('✅ Movimientos de inventario registrados exitosamente');
      } else {
        console.warn('⚠️ No se encontró inventario del vehículo para el tenant:', tenantId);
      }
      
      console.log('🎉 Entrega procesada exitosamente');
    } catch (error) {
      console.error('❌ Error procesando entrega:', error);
    }
  });