import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  WhereFilterOp,
  OrderByDirection,
  Timestamp,
  onSnapshot,
  QueryConstraint,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Cliente, Entrega, User, InventarioVehiculo } from '../types';
import { getTenantCollectionPath } from '../config/tenantConfig';

// Generic CRUD operations
export class FirebaseService {
  // Función mejorada para convertir Timestamps manteniendo tipos de datos
  private static convertTimestamps<T>(input: T): T {
    // Manejar casos nulos o undefined
    if (input === null || input === undefined) return input;
    
    if (input instanceof Timestamp) return input.toDate() as unknown as T;
    if (Array.isArray(input)) return input.map(item => this.convertTimestamps(item)) as unknown as T;
    if (input && typeof input === 'object') {
      const obj = {} as Record<string, unknown>;
      for (const [k, v] of Object.entries(input)) {
        obj[k] = this.convertTimestamps(v);
      }
      return obj as T;
    }
    return input;
  }

  static async getCollection<T>(collectionName: string): Promise<T[]> {
    try {
      // Obtener el usuario actual
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('Usuario no autenticado o sin email');
      }

      // Construir la ruta usando el email del usuario como tenant ID
      const collectionPath = `tenants/${user.email}/${collectionName}`;
      const querySnapshot = await getDocs(collection(db, collectionPath));
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        if (!data) {
          console.warn(`Documento ${doc.id} en ${collectionPath} no tiene datos`);
          return { id: doc.id } as T;
        }
        return {
          id: doc.id,
          ...this.convertTimestamps(data)
        } as T;
      });
    } catch (error) {
      console.error(`Error al obtener colección ${collectionName}:`, error);
      
      throw error;
    }
  }

  static async getDocument<T>(collectionName: string, id: string): Promise<T | null> {
    try {
      // Para la colección users, usar la ruta directa
      const isUsersCollection = collectionName === 'users';
      
      let docRef;
      if (isUsersCollection) {
        docRef = doc(db, collectionName, id);
      } else {
        // Para otras colecciones, usar el email del usuario como tenant ID
        const user = auth.currentUser;
        if (!user || !user.email) {
          throw new Error('Usuario no autenticado o sin email');
        }
        const collectionPath = `tenants/${user.email}/${collectionName}`;
        docRef = doc(db, collectionPath, id);
      }
      
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (!data) {
          console.warn(`Documento ${id} en ${collectionName} no tiene datos`);
          return { id: docSnap.id } as T;
        }
        return {
          id: docSnap.id,
          ...this.convertTimestamps(data)
        } as T;
      }
      return null;
    } catch (error) {
      console.error(`Error al obtener documento ${collectionName}/${id}:`, error);
      throw error;
    }
  }

  static async createDocument<T>(collectionName: string, data: Omit<T, 'id'>): Promise<string> {
    try {
      // Obtener el usuario actual
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('Usuario no autenticado o sin email');
      }

      // Construir la ruta usando el email del usuario como tenant ID
      const collectionPath = `tenants/${user.email}/${collectionName}`;
      const docRef = await addDoc(collection(db, collectionPath), {
        ...data,
        tenantId: user.email, // Usar el email como tenant ID
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error(`Error al crear documento en ${collectionName}:`, error);
      throw error;
    }
  }

  static async updateDocument<T>(collectionName: string, id: string, data: Partial<T>): Promise<void> {
    try {
      // Obtener el usuario actual
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('Usuario no autenticado o sin email');
      }

      // Construir la ruta usando el email del usuario como tenant ID
      const collectionPath = `tenants/${user.email}/${collectionName}`;
      const docRef = doc(db, collectionPath, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(`Error al actualizar documento ${collectionName}/${id}:`, error);
      throw error;
    }
  }

  static async deleteDocument(collectionName: string, id: string): Promise<void> {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error al eliminar documento ${collectionName}/${id}:`, error);
      throw error;
    }
  }

  // Specific operations
  static async getClientes(): Promise<Cliente[]> {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('Usuario no autenticado o sin email');
    }
    
    const collectionPath = `tenants/${user.email}/clientes`;
    const q = query(
      collection(db, collectionPath),
      orderBy('nombre', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      if (!data) {
        console.warn(`Cliente ${doc.id} no tiene datos`);
        return { id: doc.id } as Cliente;
      }
      return {
        id: doc.id,
        ...this.convertTimestamps(data)
      } as Cliente;
    });
  }

  static async getClientesWithSaldo(): Promise<Cliente[]> {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('Usuario no autenticado o sin email');
    }
    
    const collectionPath = `tenants/${user.email}/clientes`;
    const q = query(
      collection(db, collectionPath),
      where('saldoPendiente', '>', 0),
      orderBy('saldoPendiente', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...this.convertTimestamps(data)
      } as Cliente;
    });
  }

  static async getEntregas(): Promise<Entrega[]> {
    const collectionPath = getTenantCollectionPath('entregas');
    const q = query(
      collection(db, collectionPath),
      orderBy('fecha', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      if (!data) {
        console.warn(`Entrega ${doc.id} no tiene datos`);
        return { id: doc.id } as Entrega;
      }
      return {
        id: doc.id,
        ...this.convertTimestamps(data)
      } as Entrega;
    });
  }

  static async getEntregasByCliente(clienteId: string): Promise<Entrega[]> {
    const collectionPath = getTenantCollectionPath('entregas');
    const q = query(
      collection(db, collectionPath),
      where('clienteId', '==', clienteId),
      orderBy('fecha', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...this.convertTimestamps(data)
      } as Entrega;
    });
  }

  static async getEntregasHoy(): Promise<Entrega[]> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const collectionPath = getTenantCollectionPath('entregas');
    const q = query(
      collection(db, collectionPath),
      where('fecha', '>=', Timestamp.fromDate(hoy)),
      orderBy('fecha', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...this.convertTimestamps(data)
      } as Entrega;
    });
  }

  static async getEntregasByDateRange(startDate: Date, endDate: Date): Promise<Entrega[]> {
    const collectionPath = getTenantCollectionPath('entregas');
    const q = query(
      collection(db, collectionPath),
      where('fecha', '>=', Timestamp.fromDate(startDate)),
      where('fecha', '<=', Timestamp.fromDate(endDate)),
      orderBy('fecha', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...this.convertTimestamps(data)
      } as Entrega;
    });
  }

  static subscribeToCollection<T>(
    collectionName: string,
    callback: (data: T[]) => void,
    onError?: (error: Error) => void,
    queryConstraints?: QueryConstraint[]
  ): () => void {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('Usuario no autenticado o sin email');
      }
      
      const collectionPath = `tenants/${user.email}/${collectionName}`;
      const q = queryConstraints 
        ? query(collection(db, collectionPath), ...queryConstraints)
        : collection(db, collectionPath);

      return onSnapshot(q, {
        next: (querySnapshot) => {
          try {
            const data = querySnapshot.docs.map(doc => {
              const docData = doc.data();
              if (!docData) {
                console.warn(`Documento ${doc.id} en ${collectionName} no tiene datos`);
                return { id: doc.id } as T;
              }
              return {
                id: doc.id,
                ...this.convertTimestamps(docData)
              } as T;
            });
            callback(data);
          } catch (error) {
            console.error(`Error procesando datos de ${collectionName}:`, error);
            if (onError) onError(error as Error);
          }
        },
        error: (error) => {
          console.error(`Error en subscribeToCollection ${collectionName}:`, error);
          
          // Manejar errores específicos de autenticación
          if (error.code === 'permission-denied') {
            console.error('Error de permisos: Usuario no autenticado o sin permisos');
          } else if (error.code === 'unavailable') {
            console.error('Firestore no disponible');
          } else if (error.code === 'resource-exhausted') {
            console.error('Límite de recursos excedido');
          }
          
          if (onError) onError(error);
        }
      });
    } catch (error) {
      console.error(`Error al crear suscripción para ${collectionName}:`, error);
      if (onError) onError(error as Error);
      
      // Retornar una función vacía para evitar errores
      return () => {};
    }
  }

  static async createUserDocument(userData: Omit<User, 'id'>): Promise<void> {
    try {
      console.log('🔧 Iniciando createUserDocument con datos:', userData);
      
      // Verificar que tenemos los datos necesarios
      if (!userData.uid) {
        throw new Error('UID del usuario es requerido');
      }
      if (!userData.email) {
        throw new Error('Email del usuario es requerido');
      }

      // Crear documento de usuario
      console.log('📝 Creando documento de usuario en /users/', userData.uid);
      const userRef = doc(db, 'users', userData.uid);
      await setDoc(userRef, {
        ...userData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      console.log('✅ Documento de usuario creado exitosamente');

      // Nota: Las colecciones del tenant se crearán automáticamente cuando se necesiten
      // No es necesario crearlas aquí para evitar problemas de permisos
    } catch (error) {
      console.error('❌ Error al crear documento de usuario:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userData: userData
      });
      throw error;
    }
  }

  static async createTenantDocument(tenantData: any): Promise<void> {
    try {
      console.log('🔧 Iniciando createTenantDocument con datos:', tenantData);
      
      // Verificar que tenemos los datos necesarios
      if (!tenantData.id) {
        throw new Error('ID del tenant es requerido');
      }
      if (!tenantData.email) {
        throw new Error('Email del tenant es requerido');
      }

      // Crear documento de tenant
      console.log('📝 Creando documento de tenant en /tenants/', tenantData.id);
      const tenantRef = doc(db, 'tenants', tenantData.id);
      await setDoc(tenantRef, {
        ...tenantData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      console.log('✅ Documento de tenant creado exitosamente');
    } catch (error) {
      console.error('❌ Error al crear documento de tenant:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        tenantData: tenantData
      });
      throw error;
    }
  }

  static async initializeTenantCollections(email: string): Promise<void> {
    try {
      console.log('🏗️ Inicializando colecciones para tenant:', email);
      const tenantPath = `tenants/${email}`;
      
      // Crear colecciones básicas
      const collections = ['clientes', 'entregas', 'inventario', 'rutas'];
      
      // Crear todas las colecciones en paralelo para mayor velocidad
      const promises = collections.map(async (collectionName) => {
        console.log(`📁 Creando colección: ${tenantPath}/${collectionName}`);
        const collectionRef = collection(db, `${tenantPath}/${collectionName}`);
        // Crear un documento inicial vacío para que exista la colección
        const docRef = await addDoc(collectionRef, {
          _init: true,
          createdAt: Timestamp.now()
        });
        console.log(`✅ Colección ${collectionName} creada con documento:`, docRef.id);
        return docRef;
      });

      await Promise.all(promises);
      console.log('✅ Todas las colecciones del tenant inicializadas');
    } catch (error) {
      console.error('❌ Error al inicializar colecciones del tenant:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        email: email
      });
      throw error;
    }
  }

  static async isFirstUser(): Promise<boolean> {
    try {
      console.log('🔍 Verificando si es el primer usuario...');
      // Usar la colección users directamente
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(query(usersRef, limit(10))); // Obtener hasta 10 usuarios para debug
      const isEmpty = usersSnapshot.empty;
      const userCount = usersSnapshot.size;
      
      console.log('📊 Colección users está vacía:', isEmpty);
      console.log('👥 Número de usuarios en la colección:', userCount);
      
      if (!isEmpty) {
        console.log('📋 Usuarios existentes:');
        usersSnapshot.docs.forEach((doc, index) => {
          const data = doc.data();
          console.log(`  ${index + 1}. UID: ${doc.id}, Email: ${data.email}, Rol: ${data.rol}`);
        });
      }
      
      return isEmpty;
    } catch (error) {
      console.error('❌ Error al verificar primer usuario:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  // Método mejorado para consultas flexibles
  static async queryCollection<T>(
    collectionName: string,
    {
      filters = [],
      orderByField,
      orderDirection = 'asc',
      take
    }: {
      filters?: Array<[string, WhereFilterOp, unknown]>;
      orderByField?: string;
      orderDirection?: OrderByDirection;
      take?: number;
    } = {}
  ): Promise<T[]> {
    try {
      const constraints: QueryConstraint[] = [];
      
      filters.forEach(([field, operator, value]) => {
        constraints.push(where(field, operator, value));
      });
      
      if (orderByField) {
        constraints.push(orderBy(orderByField, orderDirection));
      }
      
      if (take) {
        constraints.push(limit(take));
      }
      
      const q = constraints.length > 0 
        ? query(collection(db, collectionName), ...constraints)
        : collection(db, collectionName);
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        if (!data) {
          console.warn(`Documento ${doc.id} en ${collectionName} no tiene datos`);
          return { id: doc.id } as T;
        }
        return {
          id: doc.id,
          ...this.convertTimestamps(data)
        } as T;
      });
    } catch (error) {
      console.error(`Error en queryCollection ${collectionName}:`, error);
      throw error;
    }
  }

  // Método para obtener la última entrega de un cliente
  static async getUltimaEntregaCliente(clienteId: string): Promise<Entrega | null> {
    try {
      const collectionPath = getTenantCollectionPath('entregas');
      const entregasRef = collection(db, collectionPath);
      const q = query(
        entregasRef,
        where('clienteId', '==', clienteId),
        orderBy('fecha', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        if (!data) {
          console.warn(`Entrega ${doc.id} no tiene datos`);
          return null;
        }
        return {
          id: doc.id,
          clienteId: data.clienteId,
          fecha: (data.fecha as Timestamp).toDate(),
          sodas: data.sodas,
          bidones10: data.bidones10,
          bidones20: data.bidones20,
          envasesDevueltos: data.envasesDevueltos,
          total: data.total,
          pagado: data.pagado,
          medioPago: data.medioPago,
          firmaURL: data.firmaURL,
          fotoEntregaURL: data.fotoEntregaURL,
          observaciones: data.observaciones,
          createdAt: (data.createdAt as Timestamp).toDate()
        };
      }
      return null;
    } catch (error) {
      console.error('Error al obtener última entrega:', error);
      throw error;
    }
  }

  // Método para obtener las últimas entregas de múltiples clientes de manera eficiente
  static async getUltimasEntregasClientes(clienteIds: string[]): Promise<Map<string, Entrega>> {
    const ultimasEntregas = new Map<string, Entrega>();
    
    if (clienteIds.length === 0) return ultimasEntregas;
    
    // Obtener todas las entregas recientes (últimos 30 días) para optimizar
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 30);
    
    const entregas = await this.queryCollection<Entrega>('entregas', {
      filters: [['fecha', '>=', Timestamp.fromDate(fechaLimite)]],
      orderByField: 'fecha',
      orderDirection: 'desc'
    });
    
    // Agrupar por cliente y tomar la más reciente de cada uno
    const entregasPorCliente = new Map<string, Entrega[]>();
    
    entregas.forEach(entrega => {
      if (clienteIds.includes(entrega.clienteId)) {
        if (!entregasPorCliente.has(entrega.clienteId)) {
          entregasPorCliente.set(entrega.clienteId, []);
        }
        entregasPorCliente.get(entrega.clienteId)?.push(entrega);
      }
    });
    
    // Obtener la más reciente de cada cliente
    entregasPorCliente.forEach((entregas, clienteId) => {
      const ultimaEntrega = entregas.reduce((latest, current) => 
        current.fecha > latest.fecha ? current : latest
      );
      ultimasEntregas.set(clienteId, ultimaEntrega);
    });
    
    return ultimasEntregas;
  }

  // Método mejorado para obtener el inventario actual
  static async getInventarioActual(): Promise<InventarioVehiculo | null> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const collectionPath = getTenantCollectionPath('inventarioVehiculo');
      const q = query(
        collection(db, collectionPath),
        where('fecha', '>=', Timestamp.fromDate(today)),
        orderBy('fecha', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        if (!data) {
          console.warn(`Inventario ${doc.id} no tiene datos`);
          return null;
        }
        return {
          id: doc.id,
          fecha: data.fecha.toDate(),
          sodas: data.sodas || 0,
          bidones10: data.bidones10 || 0,
          bidones20: data.bidones20 || 0,
          envasesDevueltos: data.envasesDevueltos || 0,
          updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date()
        };
      }
      return null;
    } catch (error) {
      console.error('Error al obtener inventario:', error);
      throw error;
    }
  }
}