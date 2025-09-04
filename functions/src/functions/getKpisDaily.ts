import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

interface KpiData {
  litrosVendidos?: number;
  cobranzasTotal?: number;
  clientesAtendidos?: number;
  entregasRealizadas?: number;
  porcentajeMora?: number;
  fecha: admin.firestore.Timestamp;
}

interface KpiTotals {
  litrosVendidos: number;
  cobranzasTotal: number;
  clientesAtendidos: number;
  entregasRealizadas: number;
}

export const getKpisDaily = onCall(async (request) => {
  // Verify authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { startDate, endDate } = request.data as { startDate?: string; endDate?: string };
  
  try {
    const db = admin.firestore();
    
    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Get KPIs from the specified date range
    const kpisSnapshot = await db.collection('kpis')
      .where('fecha', '>=', start)
      .where('fecha', '<=', end)
      .orderBy('fecha', 'desc')
      .get();
    
    const kpis = kpisSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      fecha: doc.data().fecha.toDate()
    }));
    
    // Calculate totals and averages
    const totals = kpis.reduce((acc: KpiTotals, kpi: KpiData) => ({
      litrosVendidos: acc.litrosVendidos + (kpi.litrosVendidos || 0),
      cobranzasTotal: acc.cobranzasTotal + (kpi.cobranzasTotal || 0),
      clientesAtendidos: acc.clientesAtendidos + (kpi.clientesAtendidos || 0),
      entregasRealizadas: acc.entregasRealizadas + (kpi.entregasRealizadas || 0),
    }), {
      litrosVendidos: 0,
      cobranzasTotal: 0,
      clientesAtendidos: 0,
      entregasRealizadas: 0,
    });
    
    const averages = {
      litrosVendidos: kpis.length > 0 ? totals.litrosVendidos / kpis.length : 0,
      cobranzasTotal: kpis.length > 0 ? totals.cobranzasTotal / kpis.length : 0,
      clientesAtendidos: kpis.length > 0 ? totals.clientesAtendidos / kpis.length : 0,
      entregasRealizadas: kpis.length > 0 ? totals.entregasRealizadas / kpis.length : 0,
      porcentajeMora: kpis.length > 0 ? kpis.reduce((acc: number, kpi: KpiData) => acc + (kpi.porcentajeMora || 0), 0) / kpis.length : 0,
    };
    
    return {
      kpis,
      totals,
      averages,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        days: kpis.length
      }
    };
    
  } catch (error) {
    console.error('Error getting KPIs:', error);
    throw new HttpsError('internal', 'Error retrieving KPIs');
  }
});