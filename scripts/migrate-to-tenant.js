import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Leer el archivo de configuración de servicio
const serviceAccountPath = join(__dirname, '../serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://sodapp-5cb8a.firebaseio.com"
});

const db = admin.firestore();

// Configuración de tenants
const TENANTS = {
  'default': {
    id: 'default',
    name: 'VaListo',
    projectId: 'sodapp-5cb8a'
  },
  'cristian': {
    id: 'cristian',
    name: 'Cristian Padin - Reparto de Agua',
    projectId: 'sodapp-5cb8a'
  },
  'agua-pura': {
    id: 'agua-pura',
    name: 'Agua Pura S.A.',
    projectId: 'sodapp-5cb8a'
  },
  'sodas-express': {
    id: 'sodas-express',
    name: 'Sodas Express',
    projectId: 'sodapp-5cb8a'
  }
};

// Colecciones a migrar
const COLLECTIONS_TO_MIGRATE = [
  'clientes',
  'entregas',
  'inventario',
  'rutas',
  'productos',
  'categoriasProductos',
  'movimientosInventario',
  'ajustesInventario',
  'proveedores',
  'historialPrecios',
  'inventarioVehicular',
  'configuracionInventario'
];

async function migrateCollectionToTenant(collectionName, tenantId) {
  console.log(`🔄 Migrando colección ${collectionName} para tenant ${tenantId}...`);
  
  try {
    // Obtener todos los documentos de la colección original
    const snapshot = await db.collection(collectionName).get();
    
    if (snapshot.empty) {
      console.log(`📭 No hay documentos en ${collectionName}`);
      return 0;
    }
    
    let migratedCount = 0;
    
    // Migrar cada documento
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Crear el documento en la nueva estructura con tenant
      const newPath = `tenants/${tenantId}/${collectionName}/${doc.id}`;
      
      await db.doc(newPath).set({
        ...data,
        tenantId: tenantId,
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        originalId: doc.id
      });
      
      migratedCount++;
    }
    
    console.log(`✅ Migrados ${migratedCount} documentos de ${collectionName} para tenant ${tenantId}`);
    return migratedCount;
    
  } catch (error) {
    console.error(`❌ Error migrando ${collectionName} para tenant ${tenantId}:`, error);
    throw error;
  }
}

async function migrateAllCollectionsForTenant(tenantId) {
  console.log(`\n🚀 Iniciando migración para tenant: ${tenantId}`);
  console.log(`📋 Tenant: ${TENANTS[tenantId].name}`);
  
  let totalMigrated = 0;
  
  for (const collectionName of COLLECTIONS_TO_MIGRATE) {
    try {
      const count = await migrateCollectionToTenant(collectionName, tenantId);
      totalMigrated += count;
    } catch (error) {
      console.error(`❌ Error en migración de ${collectionName}:`, error);
    }
  }
  
  console.log(`\n✅ Migración completada para tenant ${tenantId}`);
  console.log(`📊 Total de documentos migrados: ${totalMigrated}`);
  
  return totalMigrated;
}

async function migrateUsersToTenant(tenantId) {
  console.log(`\n👥 Migrando usuarios para tenant ${tenantId}...`);
  
  try {
    const snapshot = await db.collection('users').get();
    
    if (snapshot.empty) {
      console.log(`📭 No hay usuarios para migrar`);
      return 0;
    }
    
    let migratedCount = 0;
    
    for (const doc of snapshot.docs) {
      const userData = doc.data();
      
      // Asignar tenant al usuario
      await db.doc(`users/${doc.id}`).update({
        tenantId: tenantId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      migratedCount++;
    }
    
    console.log(`✅ Migrados ${migratedCount} usuarios para tenant ${tenantId}`);
    return migratedCount;
    
  } catch (error) {
    console.error(`❌ Error migrando usuarios para tenant ${tenantId}:`, error);
    throw error;
  }
}

async function createTenantDocument(tenantId) {
  console.log(`\n📝 Creando documento de tenant ${tenantId}...`);
  
  try {
    const tenantData = TENANTS[tenantId];
    
    await db.doc(`tenants/${tenantId}`).set({
      ...tenantData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active'
    });
    
    console.log(`✅ Documento de tenant ${tenantId} creado`);
    
  } catch (error) {
    console.error(`❌ Error creando documento de tenant ${tenantId}:`, error);
    throw error;
  }
}

async function main() {
  console.log('🏢 Iniciando migración al sistema Multi-Tenant por Colección');
  console.log('=' .repeat(60));
  
  const tenantIds = Object.keys(TENANTS);
  let totalDocumentsMigrated = 0;
  
  for (const tenantId of tenantIds) {
    try {
      // Crear documento del tenant
      await createTenantDocument(tenantId);
      
      // Migrar usuarios
      await migrateUsersToTenant(tenantId);
      
      // Migrar colecciones
      const count = await migrateAllCollectionsForTenant(tenantId);
      totalDocumentsMigrated += count;
      
    } catch (error) {
      console.error(`❌ Error en migración del tenant ${tenantId}:`, error);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🎉 MIGRACIÓN COMPLETADA');
  console.log(`📊 Total de documentos migrados: ${totalDocumentsMigrated}`);
  console.log(`🏢 Tenants procesados: ${tenantIds.length}`);
  console.log('=' .repeat(60));
  
  console.log('\n📋 Próximos pasos:');
  console.log('1. Verificar que los datos se migraron correctamente');
  console.log('2. Actualizar la aplicación para usar el nuevo sistema');
  console.log('3. Probar con diferentes usuarios/tenants');
  console.log('4. Eliminar datos antiguos si es necesario');
}

// Ejecutar migración
main()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en el script:', error);
    process.exit(1);
  });

export {
  migrateCollectionToTenant,
  migrateAllCollectionsForTenant,
  migrateUsersToTenant,
  createTenantDocument
};
