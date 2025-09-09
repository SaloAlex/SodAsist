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
exports.onUserCreate = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
/**
 * Trigger que se ejecuta cuando se crea un nuevo usuario
 * Para usuarios con plan 'individual', inicializa el inventario del vehículo
 */
exports.onUserCreate = (0, firestore_1.onDocumentCreated)('tenants/{tenantId}/users/{userId}', async (event) => {
    var _a;
    const userData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    const tenantId = event.params.tenantId;
    const userId = event.params.userId;
    if (!userData) {
        console.error('❌ No se encontraron datos del usuario');
        return;
    }
    try {
        console.log('🔄 Trigger onUserCreate ejecutado para tenant:', tenantId);
        console.log('👤 Usuario creado:', userId);
        const userPlan = userData.plan || 'individual';
        // Solo inicializar para plan individual
        if (userPlan !== 'individual') {
            console.log('📋 Plan no es individual, saltando inicialización automática');
            return;
        }
        console.log('✅ Plan individual detectado, inicializando inventario del vehículo');
        // Obtener todos los productos del tenant
        const productosSnapshot = await admin.firestore()
            .collection(`tenants/${tenantId}/productos`)
            .get();
        if (productosSnapshot.empty) {
            console.log('📦 No hay productos para sincronizar');
            return;
        }
        // Crear inventario del vehículo con el stock actual de todos los productos
        const inventarioVehiculoData = {};
        productosSnapshot.docs.forEach(doc => {
            const producto = doc.data();
            inventarioVehiculoData[doc.id] = producto.stock || 0;
        });
        // Crear el documento de inventario del vehículo
        const inventarioVehiculoRef = admin.firestore()
            .collection(`tenants/${tenantId}/inventarioVehiculo`)
            .doc('actual');
        await inventarioVehiculoRef.set(Object.assign(Object.assign({}, inventarioVehiculoData), { updatedAt: admin.firestore.FieldValue.serverTimestamp(), fecha: admin.firestore.FieldValue.serverTimestamp(), sincronizadoAutomaticamente: true, plan: 'individual', inicializadoPor: userId }));
        console.log('✅ Inventario del vehículo inicializado para plan individual');
        console.log('📊 Productos sincronizados:', Object.keys(inventarioVehiculoData).length);
    }
    catch (error) {
        console.error('❌ Error en onUserCreate:', error);
    }
});
//# sourceMappingURL=onUserCreate.js.map