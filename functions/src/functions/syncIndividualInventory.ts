import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

/**
 * Función callable para sincronizar el inventario del vehículo con el depósito
 * para usuarios con plan individual
 */
export const syncIndividualInventory = onCall(async (request) => {
  const { tenantId } = request.data;
  
  if (!tenantId) {
    throw new Error('tenantId es requerido');
  }

  try {
    console.log('🔄 Sincronizando inventario individual para tenant:', tenantId);
    
    // Verificar que el usuario tenga plan individual
    // Buscar en la colección users donde tenantId = email
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('tenantId', '==', tenantId)
      .limit(1)
      .get();
    
    if (usersSnapshot.empty) {
      throw new Error('Usuario no encontrado');
    }
    
    const userData = usersSnapshot.docs[0].data();
    const userPlan = userData?.plan || 'individual';
    
    if (userPlan !== 'individual') {
      throw new Error('Esta función solo es para usuarios con plan individual');
    }
    
    // Obtener todos los productos del tenant
    const productosSnapshot = await admin.firestore()
      .collection(`tenants/${tenantId}/productos`)
      .get();
    
    if (productosSnapshot.empty) {
      return {
        success: true,
        message: 'No hay productos para sincronizar',
        productosSincronizados: 0
      };
    }
    
    // Crear inventario del vehículo con el stock actual de todos los productos
    const inventarioVehiculoData: Record<string, number> = {};
    
    productosSnapshot.docs.forEach(doc => {
      const producto = doc.data();
      inventarioVehiculoData[doc.id] = producto.stock || 0;
    });
    
    // Crear o actualizar el documento de inventario del vehículo
    const inventarioVehiculoRef = admin.firestore()
      .collection(`tenants/${tenantId}/inventarioVehiculo`)
      .doc('actual');
    
    await inventarioVehiculoRef.set({
      ...inventarioVehiculoData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      fecha: admin.firestore.FieldValue.serverTimestamp(),
      sincronizadoAutomaticamente: true,
      plan: 'individual',
      sincronizadoManualmente: true
    });
    
    console.log('✅ Inventario del vehículo sincronizado para plan individual');
    
    return {
      success: true,
      message: 'Inventario sincronizado correctamente',
      productosSincronizados: Object.keys(inventarioVehiculoData).length,
      inventario: inventarioVehiculoData
    };
    
  } catch (error) {
    console.error('❌ Error en syncIndividualInventory:', error);
    throw new Error(`Error al sincronizar inventario: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
});
