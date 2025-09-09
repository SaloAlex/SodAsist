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
exports.onProductoUpdate = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
/**
 * Trigger que se ejecuta cuando se actualiza un producto en el inventario del depósito
 * Para usuarios con plan 'individual', sincroniza automáticamente el inventario del vehículo
 */
exports.onProductoUpdate = (0, firestore_1.onDocumentUpdated)('tenants/{tenantId}/productos/{productoId}', async (event) => {
    var _a, _b;
    const beforeData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const afterData = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    const tenantId = event.params.tenantId;
    const productoId = event.params.productoId;
    if (!beforeData || !afterData) {
        console.error('❌ No se encontraron datos del producto');
        return;
    }
    try {
        console.log('🔄 Trigger onProductoUpdate ejecutado para tenant:', tenantId);
        console.log('📦 Producto actualizado:', productoId);
        // Verificar si el tenant tiene plan 'individual'
        const tenantRef = admin.firestore().collection('tenants').doc(tenantId);
        const tenantDoc = await tenantRef.get();
        if (!tenantDoc.exists) {
            console.log('⚠️ Tenant no encontrado, saltando sincronización');
            return;
        }
        const tenantData = tenantDoc.data();
        const userPlan = (tenantData === null || tenantData === void 0 ? void 0 : tenantData.plan) || 'individual'; // Por defecto individual
        // Solo sincronizar para plan individual
        if (userPlan !== 'individual') {
            console.log('📋 Plan no es individual, saltando sincronización automática');
            return;
        }
        console.log('✅ Plan individual detectado, sincronizando inventario del vehículo');
        // Obtener el stock actual del producto
        const stockActual = afterData.stock || 0;
        // Actualizar el inventario del vehículo con el mismo stock
        const inventarioVehiculoRef = admin.firestore()
            .collection(`tenants/${tenantId}/inventarioVehiculo`)
            .doc('actual');
        await inventarioVehiculoRef.set({
            [productoId]: stockActual,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            fecha: admin.firestore.FieldValue.serverTimestamp(),
            sincronizadoAutomaticamente: true,
            plan: 'individual'
        }, { merge: true });
        console.log(`✅ Inventario del vehículo sincronizado: ${productoId} = ${stockActual}`);
    }
    catch (error) {
        console.error('❌ Error en onProductoUpdate:', error);
    }
});
//# sourceMappingURL=onProductoUpdate.js.map