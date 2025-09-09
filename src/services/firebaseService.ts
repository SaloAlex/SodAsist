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
    // Obtener el usuario autenticado para usar su email como tenant ID
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('Usuario no autenticado');
    }
    
    const collectionPath = `tenants/${user.email}/entregas`;
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
    // Obtener el usuario autenticado para usar su email como tenant ID
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('Usuario no autenticado');
    }
    
    const collectionPath = `tenants/${user.email}/entregas`;
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
    // Obtener el usuario autenticado para usar su email como tenant ID
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('Usuario no autenticado');
    }
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const collectionPath = `tenants/${user.email}/entregas`;
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
    // Obtener el usuario autenticado para usar su email como tenant ID
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('Usuario no autenticado');
    }
    
    const collectionPath = `tenants/${user.email}/entregas`;
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

  /**
   * Verificar si ya existe un usuario con el mismo email
   */
  static async checkEmailExists(email: string): Promise<boolean> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error al verificar email existente:', error);
      throw error;
    }
  }

  /**
   * Obtener usuario por email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() } as User;
    } catch (error) {
      console.error('Error al obtener usuario por email:', error);
      throw error;
    }
  }

  static async createUserDocument(userData: Omit<User, 'id'>): Promise<void> {
    try {
      // Verificar que tenemos los datos necesarios
      if (!userData.uid) {
        throw new Error('UID del usuario es requerido');
      }
      if (!userData.email) {
        throw new Error('Email del usuario es requerido');
      }

      // Verificar si ya existe un usuario con el mismo email
      const emailExists = await this.checkEmailExists(userData.email);
      if (emailExists) {
        throw new Error(`Ya existe una cuenta registrada con el email ${userData.email}. Por favor, inicia sesión con tu cuenta existente.`);
      }

      // Crear documento de usuario
      const userRef = doc(db, 'users', userData.uid);
      await setDoc(userRef, {
        ...userData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Nota: Las colecciones del tenant se crearán automáticamente cuando se necesiten
      // No es necesario crearlas aquí para evitar problemas de permisos
    } catch (error) {
      console.error('Error al crear documento de usuario:', error);
      throw error;
    }
  }

  static async createTenantDocument(tenantData: { id: string; email: string; [key: string]: unknown }): Promise<void> {
    try {
      // Verificar que tenemos los datos necesarios
      if (!tenantData.id) {
        throw new Error('ID del tenant es requerido');
      }
      if (!tenantData.email) {
        throw new Error('Email del tenant es requerido');
      }

      // Crear documento de tenant
      const tenantRef = doc(db, 'tenants', tenantData.id);
      await setDoc(tenantRef, {
        ...tenantData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error al crear documento de tenant:', error);
      throw error;
    }
  }

  static async initializeTenantCollections(email: string): Promise<void> {
    try {
      const tenantPath = `tenants/${email}`;
      
      // Crear colecciones básicas
      const collections = ['clientes', 'entregas', 'inventario', 'rutas'];
      
      // Crear todas las colecciones en paralelo para mayor velocidad
      const promises = collections.map(async (collectionName) => {
        const collectionRef = collection(db, `${tenantPath}/${collectionName}`);
        // Crear un documento inicial vacío para que exista la colección
        const docRef = await addDoc(collectionRef, {
          _init: true,
          createdAt: Timestamp.now()
        });
        return docRef;
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Error al inicializar colecciones del tenant:', error);
      throw error;
    }
  }

  static async isFirstUser(): Promise<boolean> {
    try {
      // Usar la colección users directamente
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(query(usersRef, limit(10))); // Obtener hasta 10 usuarios para debug
      
      return usersSnapshot.empty;
    } catch (error) {
      console.error('Error al verificar primer usuario:', error);
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
      // Obtener el usuario autenticado para usar su email como tenant ID
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('Usuario no autenticado');
      }
      
      const collectionPath = `tenants/${user.email}/entregas`;
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
      const user = auth.currentUser;
      if (!user?.email) {
        console.warn('Usuario no autenticado para obtener inventario');
        return null;
      }

      // Buscar el documento con ID 'actual' en lugar de buscar por fecha
      const inventarioRef = doc(db, `tenants/${user.email}/inventarioVehiculo`, 'actual');
      const inventarioDoc = await getDoc(inventarioRef);
      
      if (inventarioDoc.exists()) {
        const data = inventarioDoc.data();
        
        if (!data) {
          console.warn('Inventario actual no tiene datos');
          return null;
        }
        
        const inventario = {
          id: inventarioDoc.id,
          fecha: data.fecha.toDate(),
          sodas: data.sodas || 0,
          bidones10: data.bidones10 || 0,
          bidones20: data.bidones20 || 0,
          envasesDevueltos: data.envasesDevueltos || 0,
          updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date()
        };
        
        return inventario;
      }
      
      return null;
    } catch (error) {
      console.error('Error al obtener inventario:', error);
      throw error;
    }
  }

  // Método para obtener el inventario actual en formato dinámico
  static async getInventarioActualDinamico(): Promise<Record<string, number> | null> {
    try {
      const user = auth.currentUser;
      if (!user?.email) {
        console.warn('Usuario no autenticado para obtener inventario');
        return null;
      }

      const inventarioRef = doc(db, `tenants/${user.email}/inventarioVehiculo`, 'actual');
      const inventarioDoc = await getDoc(inventarioRef);
      
      if (inventarioDoc.exists()) {
        const data = inventarioDoc.data();
        
        if (!data) {
          console.warn('Inventario actual no tiene datos');
          return null;
        }
        
        const inventario: Record<string, number> = {};
        
        // Mapear todos los campos numéricos (excluyendo metadatos)
        Object.keys(data).forEach(key => {
          if (key !== 'updatedAt' && key !== 'fecha' && typeof data[key] === 'number') {
            inventario[key] = data[key];
          }
        });
        
        return inventario;
      }
      
      return null;
    } catch (error) {
      console.error('Error al obtener inventario dinámico:', error);
      throw error;
    }
  }
}