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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.genFacturaPdf = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const pdfkit_1 = __importDefault(require("pdfkit"));
exports.genFacturaPdf = (0, https_1.onCall)(async (request) => {
    // Verify authentication
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { entregaId } = request.data;
    if (!entregaId) {
        throw new https_1.HttpsError('invalid-argument', 'entregaId is required');
    }
    try {
        const db = admin.firestore();
        const storage = admin.storage();
        // Get delivery data
        const entregaDoc = await db.collection('entregas').doc(entregaId).get();
        if (!entregaDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Entrega not found');
        }
        const entrega = entregaDoc.data();
        // Get client data
        const clienteDoc = await db.collection('clientes').doc(entrega === null || entrega === void 0 ? void 0 : entrega.clienteId).get();
        if (!clienteDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Cliente not found');
        }
        const cliente = clienteDoc.data();
        // Create PDF
        const doc = new pdfkit_1.default();
        const filename = `factura_${entregaId}.pdf`;
        // Generate PDF content
        doc.fontSize(20).text('FACTURA', 50, 50);
        doc.fontSize(12);
        // Company info
        doc.text('VaListo', 50, 80);
        doc.text('Reparto de Agua', 50, 95);
        // Client info
        doc.text(`Cliente: ${cliente === null || cliente === void 0 ? void 0 : cliente.nombre}`, 50, 130);
        doc.text(`Dirección: ${cliente === null || cliente === void 0 ? void 0 : cliente.direccion}`, 50, 145);
        doc.text(`Teléfono: ${cliente === null || cliente === void 0 ? void 0 : cliente.telefono}`, 50, 160);
        // Delivery info
        doc.text(`Fecha: ${new Date(entrega === null || entrega === void 0 ? void 0 : entrega.fecha).toLocaleDateString()}`, 50, 195);
        doc.text(`Factura N°: ${entregaId}`, 50, 210);
        // Items
        let y = 250;
        doc.text('DETALLE:', 50, y);
        y += 20;
        if (entrega && entrega.sodas > 0) {
            doc.text(`Sodas: ${entrega.sodas} x $50 = $${entrega.sodas * 50}`, 50, y);
            y += 15;
        }
        if (entrega && entrega.bidones10 > 0) {
            doc.text(`Bidones 10L: ${entrega.bidones10} x $300 = $${entrega.bidones10 * 300}`, 50, y);
            y += 15;
        }
        if (entrega && entrega.bidones20 > 0) {
            doc.text(`Bidones 20L: ${entrega.bidones20} x $500 = $${entrega.bidones20 * 500}`, 50, y);
            y += 15;
        }
        // Total
        y += 20;
        doc.fontSize(14).text(`TOTAL: $${(entrega === null || entrega === void 0 ? void 0 : entrega.total) || 0}`, 50, y);
        // Status
        y += 30;
        doc.fontSize(12).text(`Estado: ${(entrega === null || entrega === void 0 ? void 0 : entrega.pagado) ? 'PAGADO' : 'PENDIENTE'}`, 50, y);
        if ((entrega === null || entrega === void 0 ? void 0 : entrega.pagado) && (entrega === null || entrega === void 0 ? void 0 : entrega.medioPago)) {
            doc.text(`Medio de pago: ${entrega.medioPago.toUpperCase()}`, 50, y + 15);
        }
        // Save PDF to storage
        const bucket = storage.bucket();
        const file = bucket.file(`facturas/${filename}`);
        const stream = file.createWriteStream({
            metadata: {
                contentType: 'application/pdf',
            },
        });
        return new Promise((resolve, reject) => {
            doc.pipe(stream);
            stream.on('error', () => {
                reject(new https_1.HttpsError('internal', 'Error saving PDF'));
            });
            stream.on('finish', async () => {
                try {
                    // Make file publicly accessible
                    await file.makePublic();
                    const publicUrl = `https://storage.googleapis.com/${bucket.name}/facturas/${filename}`;
                    // Update entrega with PDF URL
                    await db.collection('entregas').doc(entregaId).update({
                        facturaURL: publicUrl,
                        updatedAt: new Date()
                    });
                    resolve({ url: publicUrl });
                }
                catch (_a) {
                    reject(new https_1.HttpsError('internal', 'Error making PDF public'));
                }
            });
            doc.end();
        });
    }
    catch (error) {
        console.error('Error generating PDF:', error);
        throw new https_1.HttpsError('internal', 'Error generating PDF');
    }
});
//# sourceMappingURL=genFacturaPdf.js.map