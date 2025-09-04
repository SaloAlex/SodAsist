"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDailyKpis = exports.getKpisDailyData = exports.generateFacturaPdf = exports.onEntregaCreated = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const onEntregaCreate_1 = require("./triggers/onEntregaCreate");
const genFacturaPdf_1 = require("./functions/genFacturaPdf");
const getKpisDaily_1 = require("./functions/getKpisDaily");
admin.initializeApp();
// Triggers
exports.onEntregaCreated = onEntregaCreate_1.onEntregaCreate;
// Callable functions
exports.generateFacturaPdf = genFacturaPdf_1.genFacturaPdf;
exports.getKpisDailyData = getKpisDaily_1.getKpisDaily;
// Scheduled functions
exports.generateDailyKpis = functions.pubsub
    .schedule('0 1 * * *') // Daily at 1 AM
    .timeZone('America/Argentina/Buenos_Aires')
    .onRun(async () => {
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
    }
    catch (error) {
        console.error('Error generating daily KPIs:', error);
    }
});
//# sourceMappingURL=index.js.map