"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onEntregaCreate = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
exports.onEntregaCreate = functions.firestore
    .document('entregas/{entregaId}')
    .onCreate(async (snap) => {
    const entrega = snap.data();
    const db = admin.firestore();
    try {
        // Update client with last delivery data
        const clienteRef = db.collection('clientes').doc(entrega.clienteId);
        const clienteDoc = await clienteRef.get();
        if (clienteDoc.exists) {
            const clienteData = clienteDoc.data();
            let nuevoSaldo = (clienteData === null || clienteData === void 0 ? void 0 : clienteData.saldoPendiente) || 0;
            // Handle balance logic
            if (entrega.pagado) {
                // If paid, reduce previous pending balance
                nuevoSaldo = Math.max(0, nuevoSaldo - entrega.total);
            }
            else {
                // If not paid, add to pending balance
                nuevoSaldo = nuevoSaldo + entrega.total;
            }
            // Update client with all last delivery data
            await clienteRef.update({
                // Last delivery data
                bidones10: entrega.bidones10 || 0,
                bidones20: entrega.bidones20 || 0,
                sodas: entrega.sodas || 0,
                envasesDevueltos: entrega.envasesDevueltos || 0,
                total: entrega.total || 0,
                pagado: entrega.pagado || false,
                // Updated balance
                saldoPendiente: nuevoSaldo,
                // Update timestamp
                updatedAt: new Date()
            });
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
    }
    catch (error) {
        console.error('Error processing entrega:', error);
    }
});
//# sourceMappingURL=onEntregaCreate.js.map