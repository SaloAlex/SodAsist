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
exports.syncIndividualInventory = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
/**
 * Función callable para sincronizar el inventario del vehículo con el depósito
 * para usuarios con plan individual
 */
exports.syncIndividualInventory = (0, https_1.onCall)(async (request) => {
    const { tenantId } = request.data;
    if (!tenantId) {
        throw new Error('tenantId es requerido');
    }
    try {
        console.log('🔄 Sincronizando inventario individual para tenant:', tenantId);
        // Verificar que el usuario tenga plan individual
        // Buscar en la colección users donde tenantId = email
        const usersSnapshot = await admin.firestore()
            .collection('users')
            .where('tenantId', '==', tenantId)
            .limit(1)
            .get();
        if (usersSnapshot.empty) {
            throw new Error('Usuario no encontrado');
        }
        const userData = usersSnapshot.docs[0].data();
        const userPlan = (userData === null || userData === void 0 ? void 0 : userData.plan) || 'individual';
        if (userPlan !== 'individual') {
            throw new Error('Esta función solo es para usuarios con plan individual');
        }
        // Obtener todos los productos del tenant
        const productosSnapshot = await admin.firestore()
            .collection(`tenants/${tenantId}/productos`)
            .get();
        if (productosSnapshot.empty) {
            return {
                success: true,
                message: 'No hay productos para sincronizar',
                productosSincronizados: 0
            };
        }
        // Crear inventario del vehículo con el stock actual de todos los productos
        const inventarioVehiculoData = {};
        productosSnapshot.docs.forEach(doc => {
            const producto = doc.data();
            inventarioVehiculoData[doc.id] = producto.stock || 0;
        });
        // Crear o actualizar el documento de inventario del vehículo
        const inventarioVehiculoRef = admin.firestore()
            .collection(`tenants/${tenantId}/inventarioVehiculo`)
            .doc('actual');
        await inventarioVehiculoRef.set(Object.assign(Object.assign({}, inventarioVehiculoData), { updatedAt: admin.firestore.FieldValue.serverTimestamp(), fecha: admin.firestore.FieldValue.serverTimestamp(), sincronizadoAutomaticamente: true, plan: 'individual', sincronizadoManualmente: true }));
        console.log('✅ Inventario del vehículo sincronizado para plan individual');
        return {
            success: true,
            message: 'Inventario sincronizado correctamente',
            productosSincronizados: Object.keys(inventarioVehiculoData).length,
            inventario: inventarioVehiculoData
        };
    }
    catch (error) {
        console.error('❌ Error en syncIndividualInventory:', error);
        throw new Error(`Error al sincronizar inventario: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
});
//# sourceMappingURL=syncIndividualInventory.js.map