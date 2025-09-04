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
exports.generateDailyKpis = exports.getKpisDailyData = exports.generateFacturaPdf = exports.onEntregaCreated = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
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
exports.generateDailyKpis = (0, scheduler_1.onSchedule)({
    schedule: '0 1 * * *',
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
    }
    catch (error) {
        console.error('Error generating daily KPIs:', error);
    }
});
//# sourceMappingURL=index.js.map