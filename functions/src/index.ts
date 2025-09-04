import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { onEntregaCreate } from './triggers/onEntregaCreate';
import { genFacturaPdf } from './functions/genFacturaPdf';
import { getKpisDaily } from './functions/getKpisDaily';

admin.initializeApp();

// Triggers
export const onEntregaCreated = onEntregaCreate;

// Callable functions
export const generateFacturaPdf = genFacturaPdf;
export const getKpisDailyData = getKpisDaily;

// Scheduled functions
export const generateDailyKpis = onSchedule({
  schedule: '0 1 * * *', // Daily at 1 AM
  timeZone: 'America/Argentina/Buenos_Aires'
}, async () => {
    const db = admin.firestore();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    try {
      // Get all deliveries from yesterday
      const entregasSnapshot = await db.collection('entregas')
        .where('fecha', '>=', yesterday)
        .where('fecha', '<', new Date())
        .get();
      
      const entregas = entregasSnapshot.docs.map(doc => doc.data());
      
      // Calculate KPIs
      const litrosVendidos = entregas.reduce((total, entrega) => {
        return total + (entrega.sodas || 0) + (entrega.bidones10 || 0) * 10 + (entrega.bidones20 || 0) * 20;
      }, 0);
      
      const cobranzasTotal = entregas
        .filter(e => e.pagado)
        .reduce((total, entrega) => total + (entrega.total || 0), 0);
      
      const clientesAtendidos = new Set(entregas.map(e => e.clienteId)).size;
      const entregasRealizadas = entregas.length;
      
      // Calculate mora percentage
      const clientesSnapshot = await db.collection('clientes').get();
      const clientesConDeuda = clientesSnapshot.docs
        .map(doc => doc.data())
        .filter(cliente => (cliente.saldoPendiente || 0) > 0).length;
      
      const porcentajeMora = clientesSnapshot.size > 0 
        ? (clientesConDeuda / clientesSnapshot.size) * 100 
        : 0;
      
      // Save KPIs
      await db.collection('kpis').add({
        fecha: yesterday,
        litrosVendidos,
        cobranzasTotal,
        porcentajeMora,
        clientesAtendidos,
        entregasRealizadas,
        createdAt: new Date()
      });
      
      console.log('Daily KPIs generated successfully');
    } catch (error) {
      console.error('Error generating daily KPIs:', error);
    }
  });