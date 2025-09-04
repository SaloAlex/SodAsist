"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKpisDaily = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
exports.getKpisDaily = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { startDate, endDate } = data;
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
        const kpis = kpisSnapshot.docs.map(doc => (Object.assign(Object.assign({ id: doc.id }, doc.data()), { fecha: doc.data().fecha.toDate() })));
        // Calculate totals and averages
        const totals = kpis.reduce((acc, kpi) => ({
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
            porcentajeMora: kpis.length > 0 ? kpis.reduce((acc, kpi) => acc + (kpi.porcentajeMora || 0), 0) / kpis.length : 0,
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
    }
    catch (error) {
        console.error('Error getting KPIs:', error);
        throw new functions.https.HttpsError('internal', 'Error retrieving KPIs');
    }
});
//# sourceMappingURL=getKpisDaily.js.map