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
import { db } from '../config/firebase';
import { Cliente, Entrega, User, InventarioVehiculo } from '../types';

// Generic CRUD operations
export class FirebaseService {
  // Función mejorada para convertir Timestamps manteniendo tipos de datos
  private static convertTimestamps<T>(input: T): T {
    if (input instanceof Timestamp) return input.toDate() as unknown as T;
    if (Array.isArray(input)) return input.map(this.convertTimestamps) as unknown as T;
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
      const querySnapshot = await getDocs(collection(db, collectionName));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertTimestamps(doc.data())
      } as T));
    } catch (error) {
      console.error(`Error al obtener colección ${collectionName}:`, error);
      throw error;
    }
  }

  static async getDocument<T>(collectionName: string, id: string): Promise<T | null> {
    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...this.convertTimestamps(docSnap.data())
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
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
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
      const docRef = doc(db, collectionName, id);
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
  static async getClientesWithSaldo(): Promise<Cliente[]> {
    const q = query(
      collection(db, 'clientes'),
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

  static async getEntregasByCliente(clienteId: string): Promise<Entrega[]> {
    const q = query(
      collection(db, 'entregas'),
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
    
    const q = query(
      collection(db, 'entregas'),
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
    const q = query(
      collection(db, 'entregas'),
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
    const q = queryConstraints 
      ? query(collection(db, collectionName), ...queryConstraints)
      : collection(db, collectionName);

    return onSnapshot(q, {
      next: (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...this.convertTimestamps(doc.data())
        } as T));
        callback(data);
      },
      error: (error) => {
        console.error(`Error en subscribeToCollection ${collectionName}:`, error);
        if (onError) onError(error);
      }
    });
  }

  static async createUserDocument(userData: Omit<User, 'id'>): Promise<void> {
    const userRef = doc(db, 'users', userData.uid);
    await setDoc(userRef, {
      ...userData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }

  static async isFirstUser(): Promise<boolean> {
    try {
      const usersSnapshot = await getDocs(query(collection(db, 'users'), limit(1)));
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
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertTimestamps(doc.data())
      } as T));
    } catch (error) {
      console.error(`Error en queryCollection ${collectionName}:`, error);
      throw error;
    }
  }

  // Método para obtener la última entrega de un cliente
  static async getUltimaEntregaCliente(clienteId: string): Promise<Entrega | null> {
    try {
      const entregasRef = collection(db, 'entregas');
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

      const q = query(
        collection(db, 'inventarioVehiculo'),
        where('fecha', '>=', Timestamp.fromDate(today)),
        orderBy('fecha', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
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