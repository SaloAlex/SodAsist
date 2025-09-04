"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKpisDaily = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
exports.getKpisDaily = (0, https_1.onCall)(async (request) => {
    // Verify authentication
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { startDate, endDate } = request.data;
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
        throw new https_1.HttpsError('internal', 'Error retrieving KPIs');
    }
});
//# sourceMappingURL=getKpisDaily.js.map