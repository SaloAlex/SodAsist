#!/usr/bin/env node

/**
 * Script para construir el Service Worker con variables de entorno
 * Este script reemplaza los placeholders en sw.js con las variables reales
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config();

const swTemplatePath = path.join(__dirname, '../public/sw.js');
const swOutputPath = path.join(__dirname, '../dist/sw.js');

// Verificar que existe el template
if (!fs.existsSync(swTemplatePath)) {
  console.error('❌ Error: No se encontró el archivo sw.js template');
  process.exit(1);
}

// Leer el template
let swContent = fs.readFileSync(swTemplatePath, 'utf8');

// Variables de entorno requeridas
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN', 
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

// Verificar que todas las variables estén definidas
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Error: Faltan las siguientes variables de entorno:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\n💡 Asegúrate de tener un archivo .env con todas las variables necesarias');
  process.exit(1);
}

// Reemplazar placeholders con variables de entorno
const replacements = {
  '{{FIREBASE_API_KEY}}': process.env.VITE_FIREBASE_API_KEY,
  '{{FIREBASE_AUTH_DOMAIN}}': process.env.VITE_FIREBASE_AUTH_DOMAIN,
  '{{FIREBASE_PROJECT_ID}}': process.env.VITE_FIREBASE_PROJECT_ID,
  '{{FIREBASE_STORAGE_BUCKET}}': process.env.VITE_FIREBASE_STORAGE_BUCKET,
  '{{FIREBASE_MESSAGING_SENDER_ID}}': process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  '{{FIREBASE_APP_ID}}': process.env.VITE_FIREBASE_APP_ID
};

// Aplicar reemplazos
Object.entries(replacements).forEach(([placeholder, value]) => {
  swContent = swContent.replace(new RegExp(placeholder, 'g'), value);
});

// Crear directorio dist si no existe
const distDir = path.dirname(swOutputPath);
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Escribir el archivo final
fs.writeFileSync(swOutputPath, swContent);

console.log('✅ Service Worker construido exitosamente');
console.log(`📁 Archivo generado: ${swOutputPath}`);
console.log('🔒 Variables de entorno aplicadas correctamente');
