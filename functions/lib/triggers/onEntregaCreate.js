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
exports.onEntregaCreate = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
exports.onEntregaCreate = (0, firestore_1.onDocumentCreated)('tenants/{tenantId}/entregas/{entregaId}', async (event) => {
    var _a;
    const entrega = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    const db = admin.firestore();
    const tenantId = event.params.tenantId;
    if (!entrega) {
        console.error('❌ No se encontraron datos de la entrega');
        return;
    }
    try {
        console.log('🚀 Trigger onEntregaCreate ejecutado para tenant:', tenantId);
        console.log('📦 Datos de la entrega:', entrega);
        // Update client with last delivery data
        const clienteRef = db.collection(`tenants/${tenantId}/clientes`).doc(entrega.clienteId);
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
            console.log('✅ Cliente actualizado exitosamente');
        }
        // Update vehicle inventory - usar la misma estructura que el frontend
        const inventoryRef = db.collection(`tenants/${tenantId}/inventarioVehiculo`).doc('actual');
        const inventoryDoc = await inventoryRef.get();
        if (inventoryDoc.exists) {
            const inventoryData = inventoryDoc.data();
            console.log('📊 Inventario actual del vehículo:', inventoryData);
            // Calcular nuevo stock basado en los productos entregados
            const nuevoStock = Object.assign({}, inventoryData);
            // Si la entrega tiene productos dinámicos, usarlos
            if (entrega.productos && Array.isArray(entrega.productos)) {
                console.log('🔄 Procesando productos dinámicos:', entrega.productos);
                entrega.productos.forEach((producto) => {
                    var _a;
                    const nombre = ((_a = producto.nombre) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
                    console.log(`📦 Procesando: ${producto.nombre} (${producto.cantidad} unidades)`);
                    if (nombre.includes('soda') || nombre.includes('gaseosa')) {
                        const stockAnterior = nuevoStock.sodas || 0;
                        nuevoStock.sodas = Math.max(0, stockAnterior - producto.cantidad);
                        console.log(`🥤 Soda: ${stockAnterior} → ${nuevoStock.sodas}`);
                    }
                    else if (nombre.includes('10') || (nombre.includes('bidón') && !nombre.includes('20'))) {
                        const stockAnterior = nuevoStock.bidones10 || 0;
                        nuevoStock.bidones10 = Math.max(0, stockAnterior - producto.cantidad);
                        console.log(`🪣 Bidón 10L: ${stockAnterior} → ${nuevoStock.bidones10}`);
                    }
                    else if (nombre.includes('20')) {
                        const stockAnterior = nuevoStock.bidones20 || 0;
                        nuevoStock.bidones20 = Math.max(0, stockAnterior - producto.cantidad);
                        console.log(`🪣 Bidón 20L: ${stockAnterior} → ${nuevoStock.bidones20}`);
                    }
                });
            }
            else {
                // Fallback a campos legacy si no hay productos dinámicos
                console.log('🔄 Procesando campos legacy');
                nuevoStock.sodas = Math.max(0, (nuevoStock.sodas || 0) - (entrega.sodas || 0));
                nuevoStock.bidones10 = Math.max(0, (nuevoStock.bidones10 || 0) - (entrega.bidones10 || 0));
                nuevoStock.bidones20 = Math.max(0, (nuevoStock.bidones20 || 0) - (entrega.bidones20 || 0));
            }
            console.log('📊 Nuevo inventario calculado:', nuevoStock);
            await inventoryRef.update(Object.assign(Object.assign({}, nuevoStock), { updatedAt: new Date() }));
            console.log('✅ Inventario del vehículo actualizado exitosamente');
        }
        else {
            console.warn('⚠️ No se encontró inventario del vehículo para el tenant:', tenantId);
        }
        console.log('🎉 Entrega procesada exitosamente');
    }
    catch (error) {
        console.error('❌ Error procesando entrega:', error);
    }
});
//# sourceMappingURL=onEntregaCreate.js.map