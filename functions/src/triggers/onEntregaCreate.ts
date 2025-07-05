import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const onEntregaCreate = functions.firestore
  .document('entregas/{entregaId}')
  .onCreate(async (snap, context) => {
    const entrega = snap.data();
    const db = admin.firestore();
    
    try {
      // Update client balance if not paid
      if (!entrega.pagado) {
        const clienteRef = db.collection('clientes').doc(entrega.clienteId);
        const clienteDoc = await clienteRef.get();
        
        if (clienteDoc.exists) {
          const clienteData = clienteDoc.data();
          const newBalance = (clienteData?.saldoPendiente || 0) + entrega.total;
          
          await clienteRef.update({
            saldoPendiente: newBalance,
            updatedAt: new Date()
          });
        }
      }
      
      // Update vehicle inventory
      const today = new Date().toISOString().split('T')[0];
      const inventoryQuery = await db.collection('inventarioVehiculo')
        .where('fecha', '>=', new Date(today))
        .where('fecha', '<', new Date(today + 'T23:59:59'))
        .get();
      
      if (!inventoryQuery.empty) {
        const inventoryDoc = inventoryQuery.docs[0];
        const inventoryData = inventoryDoc.data();
        
        await inventoryDoc.ref.update({
          sodas: Math.max(0, (inventoryData.sodas || 0) - (entrega.sodas || 0)),
          bidones10: Math.max(0, (inventoryData.bidones10 || 0) - (entrega.bidones10 || 0)),
          bidones20: Math.max(0, (inventoryData.bidones20 || 0) - (entrega.bidones20 || 0)),
          updatedAt: new Date()
        });
      }
      
      console.log('Entrega processed successfully');
    } catch (error) {
      console.error('Error processing entrega:', error);
    }
  });