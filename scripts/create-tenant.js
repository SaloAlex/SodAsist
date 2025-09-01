#!/usr/bin/env node

/**
 * Script para crear nuevos tenants (clientes) en VaListo
 * Uso: node scripts/create-tenant.js <nombre-cliente> <dominio>
 * Ejemplo: node scripts/create-tenant.js "Agua Pura S.A." "agua-pura.valisto.app"
 */

const fs = require('fs');
const path = require('path');

const tenantName = process.argv[2];
const domain = process.argv[3];

if (!tenantName || !domain) {
  console.error('❌ Uso: node scripts/create-tenant.js <nombre-cliente> <dominio>');
  console.error('Ejemplo: node scripts/create-tenant.js "Agua Pura S.A." "agua-pura.valisto.app"');
  process.exit(1);
}

// Generar ID del tenant
const tenantId = domain.split('.')[0].replace(/[^a-z0-9]/g, '-');
const projectId = `${tenantId}-${Date.now()}`;

// Configuración del nuevo tenant
const newTenant = {
  id: tenantId,
  name: tenantName,
  projectId: projectId,
  domain: domain,
  firebaseConfig: {
    apiKey: `AIzaSy${tenantId}ApiKey${Date.now()}`,
    authDomain: `${projectId}.firebaseapp.com`,
    projectId: projectId,
    storageBucket: `${projectId}.appspot.com`,
    messagingSenderId: Math.floor(Math.random() * 1000000000).toString(),
    appId: `1:${Math.floor(Math.random() * 1000000000)}:web:${Math.random().toString(36).substr(2, 9)}`,
  }
};

console.log('🏢 Creando nuevo tenant...');
console.log(`📝 Nombre: ${tenantName}`);
console.log(`🌐 Dominio: ${domain}`);
console.log(`🆔 ID: ${tenantId}`);
console.log(`📦 Proyecto: ${projectId}`);

// Leer el archivo de configuración actual
const configPath = path.join(__dirname, '../src/config/tenantConfig.ts');
let configContent = fs.readFileSync(configPath, 'utf8');

// Agregar el nuevo tenant a la configuración
const tenantEntry = `  '${tenantId}': {
    id: '${tenantId}',
    name: '${tenantName}',
    projectId: '${projectId}',
    domain: '${domain}',
    firebaseConfig: {
      apiKey: '${newTenant.firebaseConfig.apiKey}',
      authDomain: '${newTenant.firebaseConfig.authDomain}',
      projectId: '${newTenant.firebaseConfig.projectId}',
      storageBucket: '${newTenant.firebaseConfig.storageBucket}',
      messagingSenderId: '${newTenant.firebaseConfig.messagingSenderId}',
      appId: '${newTenant.firebaseConfig.appId}',
    }
  },`;

// Insertar antes del cierre del objeto TENANTS
const insertIndex = configContent.lastIndexOf('};');
configContent = configContent.slice(0, insertIndex) + tenantEntry + '\n' + configContent.slice(insertIndex);

// Escribir el archivo actualizado
fs.writeFileSync(configPath, configContent);

console.log('✅ Tenant agregado a la configuración');

// Crear archivo de instrucciones para el cliente
const instructionsPath = path.join(__dirname, `../tenants/${tenantId}-setup.md`);
const instructions = `# Configuración para ${tenantName}

## 🔧 Pasos para configurar Firebase

1. **Crear proyecto en Firebase Console**
   - Ve a https://console.firebase.google.com/
   - Crea un nuevo proyecto con ID: \`${projectId}\`

2. **Configurar Authentication**
   - Habilita Email/Password
   - Habilita Google Sign-in
   - Agrega el dominio: \`${domain}\`

3. **Crear base de datos Firestore**
   - Crea una base de datos en modo de producción
   - Región: us-central1 (recomendado)

4. **Configurar Storage**
   - Habilita Cloud Storage
   - Región: us-central1

5. **Obtener configuración**
   - Ve a Configuración del proyecto > General
   - Copia la configuración de Firebase

6. **Actualizar configuración en VaListo**
   - Reemplaza la configuración en \`src/config/tenantConfig.ts\`
   - Actualiza las credenciales del tenant \`${tenantId}\`

## 🌐 Configuración de dominio

Configura el dominio \`${domain}\` para que apunte a tu aplicación VaListo.

## 📱 Próximos pasos

1. Desplegar la aplicación con la nueva configuración
2. Crear el primer usuario administrador
3. Configurar datos iniciales (categorías, productos, etc.)

## 🔑 Credenciales temporales

- **API Key**: ${newTenant.firebaseConfig.apiKey}
- **Project ID**: ${projectId}
- **Auth Domain**: ${newTenant.firebaseConfig.authDomain}

⚠️ **Importante**: Estas son credenciales temporales. Debes reemplazarlas con las reales de Firebase.
`;

// Crear directorio si no existe
const tenantsDir = path.join(__dirname, '../tenants');
if (!fs.existsSync(tenantsDir)) {
  fs.mkdirSync(tenantsDir);
}

fs.writeFileSync(instructionsPath, instructions);

console.log(`📋 Instrucciones guardadas en: tenants/${tenantId}-setup.md`);

console.log('\n🎉 ¡Tenant creado exitosamente!');
console.log('\n📋 Próximos pasos:');
console.log('1. Crear el proyecto en Firebase Console');
console.log('2. Configurar Authentication y Firestore');
console.log('3. Actualizar las credenciales reales en tenantConfig.ts');
console.log('4. Desplegar la aplicación');
