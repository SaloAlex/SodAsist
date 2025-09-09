import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

/**
 * Trigger que se ejecuta cuando se crea un nuevo usuario
 * Para usuarios con plan 'individual', inicializa el inventario del vehículo
 */
export const onUserCreate = onDocumentCreated('tenants/{tenantId}/users/{userId}', async (event) => {
  const userData = event.data?.data();
  const tenantId = event.params.tenantId;
  const userId = event.params.userId;
  
  if (!userData) {
    console.error('❌ No se encontraron datos del usuario');
    return;
  }

  try {
    console.log('🔄 Trigger onUserCreate ejecutado para tenant:', tenantId);
    console.log('👤 Usuario creado:', userId);
    
    const userPlan = userData.plan || 'individual';
    
    // Solo inicializar para plan individual
    if (userPlan !== 'individual') {
      console.log('📋 Plan no es individual, saltando inicialización automática');
      return;
    }
    
    console.log('✅ Plan individual detectado, inicializando inventario del vehículo');
    
    // Obtener todos los productos del tenant
    const productosSnapshot = await admin.firestore()
      .collection(`tenants/${tenantId}/productos`)
      .get();
    
    if (productosSnapshot.empty) {
      console.log('📦 No hay productos para sincronizar');
      return;
    }
    
    // Crear inventario del vehículo con el stock actual de todos los productos
    const inventarioVehiculoData: Record<string, number> = {};
    
    productosSnapshot.docs.forEach(doc => {
      const producto = doc.data();
      inventarioVehiculoData[doc.id] = producto.stock || 0;
    });
    
    // Crear el documento de inventario del vehículo
    const inventarioVehiculoRef = admin.firestore()
      .collection(`tenants/${tenantId}/inventarioVehiculo`)
      .doc('actual');
    
    await inventarioVehiculoRef.set({
      ...inventarioVehiculoData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      fecha: admin.firestore.FieldValue.serverTimestamp(),
      sincronizadoAutomaticamente: true,
      plan: 'individual',
      inicializadoPor: userId
    });
    
    console.log('✅ Inventario del vehículo inicializado para plan individual');
    console.log('📊 Productos sincronizados:', Object.keys(inventarioVehiculoData).length);
    
  } catch (error) {
    console.error('❌ Error en onUserCreate:', error);
  }
});
