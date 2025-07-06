import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  QueryConstraint,
  limit,
  WhereFilterOp,
  OrderByDirection
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Cliente, Entrega, User } from '../types';

// Generic CRUD operations
export class FirebaseService {
  // Función auxiliar para convertir Timestamps a Dates
  private static convertTimestamps(data: Record<string, unknown>): Record<string, unknown> {
    if (!data) return data;
    
    const result = { ...data };
    
    for (const [key, value] of Object.entries(result)) {
      // Si es un Timestamp, convertirlo a Date
      if (value instanceof Timestamp) {
        result[key] = value.toDate();
      }
      // Si es un objeto anidado, procesarlo recursivamente
      else if (typeof value === 'object' && value !== null) {
        result[key] = this.convertTimestamps(value as Record<string, unknown>);
      }
    }
    
    return result;
  }

  static async getCollection<T>(collectionName: string): Promise<T[]> {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...this.convertTimestamps(data)
      } as T;
    });
  }

  static async getDocument<T>(collectionName: string, id: string): Promise<T | null> {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...this.convertTimestamps(data)
      } as T;
    }
    return null;
  }

  static async createDocument<T>(collectionName: string, data: Omit<T, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  }

  static async updateDocument<T>(collectionName: string, id: string, data: Partial<T>): Promise<void> {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  }

  static async deleteDocument(collectionName: string, id: string): Promise<void> {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
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
    queryConstraints?: QueryConstraint[]
  ): () => void {
    const q = queryConstraints 
      ? query(collection(db, collectionName), ...queryConstraints)
      : collection(db, collectionName);

    return onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...this.convertTimestamps(docData)
        } as T;
      });
      callback(data);
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
    const usersSnapshot = await getDocs(collection(db, 'users'));
    return usersSnapshot.empty;
  }

  // Método para consultas flexibles con filtros, ordenamiento y límites
  static async queryCollection<T>(
    collectionName: string,
    filters?: Array<[string, WhereFilterOp, unknown]>,
    orderByField?: string,
    orderDirection?: OrderByDirection,
    limitCount?: number
  ): Promise<T[]> {
    const constraints: QueryConstraint[] = [];
    
    // Aplicar filtros
    if (filters && filters.length > 0) {
      filters.forEach(([field, operator, value]) => {
        constraints.push(where(field, operator, value));
      });
    }
    
    // Agregar ordenamiento si se especifica
    if (orderByField) {
      constraints.push(orderBy(orderByField, orderDirection || 'asc'));
    }
    
    // Agregar límite si se especifica
    if (limitCount) {
      constraints.push(limit(limitCount));
    }
    
    const q = constraints.length > 0 
      ? query(collection(db, collectionName), ...constraints)
      : collection(db, collectionName);
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...this.convertTimestamps(data)
      } as T;
    });
  }

  // Método específico para obtener la última entrega de un cliente
  static async getUltimaEntregaCliente(clienteId: string): Promise<Entrega | null> {
    const entregas = await this.queryCollection<Entrega>(
      'entregas',
      [['clienteId', '==', clienteId]],
      'fecha',
      'desc',
      1
    );
    
    return entregas.length > 0 ? entregas[0] : null;
  }

  // Método para obtener las últimas entregas de múltiples clientes de manera eficiente
  static async getUltimasEntregasClientes(clienteIds: string[]): Promise<Map<string, Entrega>> {
    const ultimasEntregas = new Map<string, Entrega>();
    
    if (clienteIds.length === 0) return ultimasEntregas;
    
    // Obtener todas las entregas recientes (últimos 30 días) para optimizar
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 30);
    
    const entregas = await this.queryCollection<Entrega>(
      'entregas',
      [['fecha', '>=', Timestamp.fromDate(fechaLimite)]],
      'fecha',
      'desc'
    );
    
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
}