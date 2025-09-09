import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

/**
 * Trigger que se ejecuta cuando se actualiza un producto en el inventario del depósito
 * Para usuarios con plan 'individual', sincroniza automáticamente el inventario del vehículo
 */
export const onProductoUpdate = onDocumentUpdated('tenants/{tenantId}/productos/{productoId}', async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();
  const tenantId = event.params.tenantId;
  const productoId = event.params.productoId;
  
  if (!beforeData || !afterData) {
    console.error('❌ No se encontraron datos del producto');
    return;
  }

  try {
    console.log('🔄 Trigger onProductoUpdate ejecutado para tenant:', tenantId);
    console.log('📦 Producto actualizado:', productoId);
    
    // Verificar si el tenant tiene plan 'individual'
    const tenantRef = admin.firestore().collection('tenants').doc(tenantId);
    const tenantDoc = await tenantRef.get();
    
    if (!tenantDoc.exists) {
      console.log('⚠️ Tenant no encontrado, saltando sincronización');
      return;
    }
    
    const tenantData = tenantDoc.data();
    const userPlan = tenantData?.plan || 'individual'; // Por defecto individual
    
    // Solo sincronizar para plan individual
    if (userPlan !== 'individual') {
      console.log('📋 Plan no es individual, saltando sincronización automática');
      return;
    }
    
    console.log('✅ Plan individual detectado, sincronizando inventario del vehículo');
    
    // Obtener el stock actual del producto
    const stockActual = afterData.stock || 0;
    
    // Actualizar el inventario del vehículo con el mismo stock
    const inventarioVehiculoRef = admin.firestore()
      .collection(`tenants/${tenantId}/inventarioVehiculo`)
      .doc('actual');
    
    await inventarioVehiculoRef.set({
      [productoId]: stockActual,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      fecha: admin.firestore.FieldValue.serverTimestamp(),
      sincronizadoAutomaticamente: true,
      plan: 'individual'
    }, { merge: true });
    
    console.log(`✅ Inventario del vehículo sincronizado: ${productoId} = ${stockActual}`);
    
  } catch (error) {
    console.error('❌ Error en onProductoUpdate:', error);
  }
});
