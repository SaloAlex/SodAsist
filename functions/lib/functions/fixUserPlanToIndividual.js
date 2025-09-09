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
exports.fixUserPlanToIndividual = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
exports.fixUserPlanToIndividual = (0, https_1.onCall)(async (request) => {
    const db = admin.firestore();
    const auth = request.auth;
    if (!auth) {
        throw new Error('Authentication required.');
    }
    const userId = auth.uid;
    const tenantId = request.data.tenantId;
    try {
        // Actualizar el plan en la colección users
        const userDocRef = db.collection('users').doc(userId);
        await userDocRef.update({
            plan: 'individual',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Actualizar el plan en la colección tenants si existe
        if (tenantId) {
            const tenantDocRef = db.collection('tenants').doc(tenantId);
            const tenantDoc = await tenantDocRef.get();
            if (tenantDoc.exists) {
                await tenantDocRef.update({
                    plan: 'individual',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        return {
            success: true,
            message: 'Plan actualizado correctamente a individual',
            userId,
            tenantId
        };
    }
    catch (error) {
        console.error('Error en fixUserPlanToIndividual:', error);
        throw new Error(`Error al corregir plan de usuario: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
});
//# sourceMappingURL=fixUserPlanToIndividual.js.map