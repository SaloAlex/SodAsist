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
  QueryConstraint
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
}