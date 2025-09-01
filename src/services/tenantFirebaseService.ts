import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  DocumentData,
  QuerySnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getTenantCollectionPath, getCurrentTenantId } from '../config/tenantConfig';

// Tipos para los datos con tenant
export interface TenantDocument {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

// Clase para manejar operaciones de Firestore con tenant
export class TenantFirebaseService {
  private tenantId: string;

  constructor() {
    this.tenantId = getCurrentTenantId();
  }

  // Obtener ruta de colección con tenant
  private getCollectionPath(collectionName: string): string {
    return getTenantCollectionPath(collectionName);
  }

  // Obtener todos los documentos de una colección
  async getCollection<T extends TenantDocument>(
    collectionName: string,
    orderByField?: string,
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<T[]> {
    try {
      const collectionRef = collection(db, this.getCollectionPath(collectionName));
      let q = query(collectionRef);

      if (orderByField) {
        q = query(collectionRef, orderBy(orderByField, orderDirection));
      }

      const querySnapshot = await getDocs(q);
      const documents: T[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as T;
        documents.push({
          ...data,
          id: doc.id,
          tenantId: this.tenantId
        });
      });

      return documents;
    } catch (error) {
      console.error(`Error getting collection ${collectionName}:`, error);
      throw error;
    }
  }

  // Obtener un documento por ID
  async getDocument<T extends TenantDocument>(
    collectionName: string,
    documentId: string
  ): Promise<T | null> {
    try {
      const docRef = doc(db, this.getCollectionPath(collectionName), documentId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as T;
        return {
          ...data,
          id: docSnap.id,
          tenantId: this.tenantId
        };
      }

      return null;
    } catch (error) {
      console.error(`Error getting document ${documentId} from ${collectionName}:`, error);
      throw error;
    }
  }

  // Agregar un nuevo documento
  async addDocument<T extends Partial<TenantDocument>>(
    collectionName: string,
    data: T
  ): Promise<string> {
    try {
      const collectionRef = collection(db, this.getCollectionPath(collectionName));
      const docData = {
        ...data,
        tenantId: this.tenantId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(collectionRef, docData);
      return docRef.id;
    } catch (error) {
      console.error(`Error adding document to ${collectionName}:`, error);
      throw error;
    }
  }

  // Actualizar un documento
  async updateDocument<T extends Partial<TenantDocument>>(
    collectionName: string,
    documentId: string,
    data: T
  ): Promise<void> {
    try {
      const docRef = doc(db, this.getCollectionPath(collectionName), documentId);
      const updateData = {
        ...data,
        updatedAt: new Date()
      };

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error(`Error updating document ${documentId} in ${collectionName}:`, error);
      throw error;
    }
  }

  // Eliminar un documento
  async deleteDocument(
    collectionName: string,
    documentId: string
  ): Promise<void> {
    try {
      const docRef = doc(db, this.getCollectionPath(collectionName), documentId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document ${documentId} from ${collectionName}:`, error);
      throw error;
    }
  }

  // Buscar documentos con filtros
  async queryDocuments<T extends TenantDocument>(
    collectionName: string,
    filters: Array<{ field: string; operator: any; value: any }>,
    orderByField?: string,
    orderDirection: 'asc' | 'desc' = 'desc',
    limitCount?: number
  ): Promise<T[]> {
    try {
      const collectionRef = collection(db, this.getCollectionPath(collectionName));
      let q = query(collectionRef);

      // Aplicar filtros
      filters.forEach(filter => {
        q = query(q, where(filter.field, filter.operator, filter.value));
      });

      // Aplicar ordenamiento
      if (orderByField) {
        q = query(q, orderBy(orderByField, orderDirection));
      }

      // Aplicar límite
      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const querySnapshot = await getDocs(q);
      const documents: T[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as T;
        documents.push({
          ...data,
          id: doc.id,
          tenantId: this.tenantId
        });
      });

      return documents;
    } catch (error) {
      console.error(`Error querying collection ${collectionName}:`, error);
      throw error;
    }
  }

  // Suscripción en tiempo real
  subscribeToCollection<T extends TenantDocument>(
    collectionName: string,
    callback: (documents: T[]) => void,
    orderByField?: string,
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Unsubscribe {
    try {
      const collectionRef = collection(db, this.getCollectionPath(collectionName));
      let q = query(collectionRef);

      if (orderByField) {
        q = query(collectionRef, orderBy(orderByField, orderDirection));
      }

      return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
        const documents: T[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data() as T;
          documents.push({
            ...data,
            id: doc.id,
            tenantId: this.tenantId
          });
        });

        callback(documents);
      });
    } catch (error) {
      console.error(`Error subscribing to collection ${collectionName}:`, error);
      throw error;
    }
  }

  // Obtener estadísticas del tenant
  async getTenantStats(): Promise<{
    totalClients: number;
    totalDeliveries: number;
    totalProducts: number;
  }> {
    try {
      const [clients, deliveries, products] = await Promise.all([
        this.getCollection('clientes'),
        this.getCollection('entregas'),
        this.getCollection('inventario')
      ]);

      return {
        totalClients: clients.length,
        totalDeliveries: deliveries.length,
        totalProducts: products.length
      };
    } catch (error) {
      console.error('Error getting tenant stats:', error);
      throw error;
    }
  }
}

// Instancia singleton del servicio
export const tenantFirebaseService = new TenantFirebaseService();
