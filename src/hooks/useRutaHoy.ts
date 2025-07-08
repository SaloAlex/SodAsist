import { useState, useEffect, useCallback } from 'react';
import { ClienteConRuta, RutaOptimizada, Visita, EstadoVisita } from '../types';
import { FirebaseService } from '../services/firebaseService';
import { RouteOptimizer } from '../services/routeOptimizer';
import { collection, query, where, orderBy, getDocs, doc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface UseRutaHoyReturn {
  clientes: ClienteConRuta[];
  rutaOptimizada: RutaOptimizada | null;
  loading: boolean;
  optimizing: boolean;
  visitasCompletadas: Map<string, Visita>;
  error: Error | null;
  reoptimizarRuta: () => Promise<void>;
  marcarVisita: (clienteId: string, estado: EstadoVisita, notas?: string) => Promise<void>;
  agregarNota: (clienteId: string, nota: string) => Promise<void>;
  obtenerHistorialVisitas: (clienteId: string) => Promise<Visita[]>;
  actualizarOrdenManual: (nuevoOrden: string[]) => Promise<void>;
  filtrarPorZona: (zona: string) => void;
  exportarRuta: () => Promise<Blob>;
  enviarNotificacion: (clienteId: string, mensaje: string) => Promise<void>;
}

export const useRutaHoy = (): UseRutaHoyReturn => {
  const [clientes, setClientes] = useState<ClienteConRuta[]>([]);
  const [rutaOptimizada, setRutaOptimizada] = useState<RutaOptimizada | null>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [visitasCompletadas, setVisitasCompletadas] = useState<Map<string, Visita>>(new Map());
  const [error, setError] = useState<Error | null>(null);
  const [zonaSeleccionada, setZonaSeleccionada] = useState<string>('');
  const { userData, loading: authLoading } = useAuthStore();

  // Mover filterClientesParaHoy a useCallback
  const filterClientesParaHoy = useCallback((clientes: ClienteConRuta[]): ClienteConRuta[] => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const dayOfMonth = today.getDate();
    const weekOfYear = Math.ceil(dayOfMonth / 7);
    
    const daysMap: Record<number, string> = {
      0: 'domingo',
      1: 'lunes',
      2: 'martes',
      3: 'miércoles',
      4: 'jueves',
      5: 'viernes',
      6: 'sábado'
    };
    
    const todayName = daysMap[dayOfWeek];
    
    return clientes.filter(cliente => {
      if (zonaSeleccionada && cliente.zona !== zonaSeleccionada) {
        return false;
      }

      if (cliente.diaVisita !== todayName) {
        return false;
      }
      
      switch (cliente.frecuenciaVisita) {
        case 'semanal':
          return true;
        case 'quincenal':
          return weekOfYear % 2 === 1;
        case 'mensual':
          return dayOfMonth <= 7;
        default:
          return false;
      }
    });
  }, [zonaSeleccionada]); // Agregar zonaSeleccionada como dependencia

  // Cargar datos iniciales
  useEffect(() => {
    // Si todavía está cargando la autenticación, esperar
    if (authLoading) {
      return;
    }

    // Si no hay usuario autenticado o userData después de cargar, mostrar error
    if (!auth.currentUser || !userData) {
      setError(new Error('No hay usuario autenticado'));
      setLoading(false);
      return;
    }

    const cargarDatos = async () => {
      try {
        setLoading(true);
        setError(null);

        // Verificar permisos
        if (!['admin', 'sodero'].includes(userData.rol)) {
          throw new Error('No tienes permisos para ver esta información');
        }

        // Cargar clientes y visitas del día
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const visitasQuery = query(
          collection(db, 'visitas'),
          where('fecha', '>=', Timestamp.fromDate(today)),
          orderBy('fecha', 'desc')
        );

        const [clientesData, visitasData] = await Promise.all([
          FirebaseService.getCollection<ClienteConRuta>('clientes'),
          getDocs(visitasQuery)
        ]);

        // Procesar visitas
        const visitasMap = new Map<string, Visita>();
        visitasData.docs.forEach(doc => {
          const visita = { id: doc.id, ...doc.data() } as Visita;
          if (visita.completada) {
            visitasMap.set(visita.clienteId, visita);
          }
        });
        setVisitasCompletadas(visitasMap);

        // Filtrar y procesar clientes
        const clientesFiltrados = filterClientesParaHoy(clientesData);
        setClientes(clientesFiltrados);

        if (clientesFiltrados.length > 0) {
          await optimizarRuta(clientesFiltrados);
        }
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError(err instanceof Error ? err : new Error('Error desconocido'));
        toast.error(err instanceof Error ? err.message : 'Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [userData, authLoading, filterClientesParaHoy]); // Agregar filterClientesParaHoy a las dependencias

  // Optimizar ruta
  const optimizarRuta = async (clientesData: ClienteConRuta[]) => {
    setOptimizing(true);
    try {
      const optimized = await RouteOptimizer.optimizeRoute(clientesData);
      const rutaDoc: RutaOptimizada = {
        id: doc(collection(db, 'rutas')).id,
        fecha: new Date(),
        clientes: optimized.map((cliente, index) => ({
          clienteId: cliente.id!,
          orden: index,
          distanciaAlSiguiente: 0, // Se calculará en el servicio
          tiempoEstimado: 0 // Se calculará en el servicio
        })),
        distanciaTotal: 0, // Se calculará en el servicio
        tiempoEstimadoTotal: 0, // Se calculará en el servicio
        zonas: Array.from(new Set(clientesData.map(c => c.zona).filter(Boolean))) as string[]
      };
      
      await setDoc(doc(db, 'rutas', rutaDoc.id), {
        ...rutaDoc,
        fecha: serverTimestamp()
      });

      setRutaOptimizada(rutaDoc);
    } catch (err) {
      console.error('Error al optimizar ruta:', err);
      toast.error('Error al optimizar la ruta');
    } finally {
      setOptimizing(false);
    }
  };

  // Marcar visita
  const marcarVisita = async (clienteId: string, estado: EstadoVisita, notas?: string) => {
    try {
      if (estado === EstadoVisita.PENDIENTE) {
        // Si cambiamos a pendiente, eliminamos la visita existente
        const visitaExistente = visitasCompletadas.get(clienteId);
        if (visitaExistente) {
          await FirebaseService.deleteDocument('visitas', visitaExistente.id);
          setVisitasCompletadas(prev => {
            const newMap = new Map(prev);
            newMap.delete(clienteId);
            return newMap;
          });
          toast.success('Visita marcada como pendiente');
        }
        return;
      }

      const visitaId = doc(collection(db, 'visitas')).id;
      const visitaBase = {
        id: visitaId,
        clienteId,
        completada: estado === EstadoVisita.COMPLETADA,
        tiempoVisita: 0, // Se calculará
        ubicacionCompletado: { lat: 0, lng: 0 } // Se obtendrá la ubicación actual
      };

      const visitaData = {
        ...visitaBase,
        ...(notas ? { notas } : {}), // Solo incluir notas si existe
        fecha: serverTimestamp()
      };

      await setDoc(doc(db, 'visitas', visitaId), visitaData);

      if (estado === EstadoVisita.COMPLETADA) {
        // Esperar a que Firestore asigne el timestamp
        const visitaCompleta: Visita = {
          ...visitaBase,
          ...(notas ? { notas } : {}),
          fecha: {
            seconds: Math.floor(Date.now() / 1000),
            nanoseconds: 0
          }
        };
        setVisitasCompletadas(prev => new Map(prev).set(clienteId, visitaCompleta));
        toast.success('Visita marcada como completada');
      } else {
        setVisitasCompletadas(prev => {
          const newMap = new Map(prev);
          newMap.delete(clienteId);
          return newMap;
        });
        toast.success(`Visita marcada como ${estado}`);
      }
    } catch (err) {
      console.error('Error al marcar visita:', err);
      toast.error('Error al actualizar la visita');
      throw err;
    }
  };

  // Agregar nota
  const agregarNota = async (clienteId: string, nota: string) => {
    try {
      const visita = visitasCompletadas.get(clienteId);
      if (visita) {
        await updateDoc(doc(db, 'visitas', visita.id), {
          notas: nota,
          fechaActualizacion: serverTimestamp()
        });
        
        setVisitasCompletadas(prev => {
          const newMap = new Map(prev);
          newMap.set(clienteId, { ...visita, notas: nota });
          return newMap;
        });

        toast.success('Nota agregada correctamente');
      }
    } catch (err) {
      console.error('Error al agregar nota:', err);
      toast.error('Error al guardar la nota');
    }
  };

  // Obtener historial de visitas
  const obtenerHistorialVisitas = async (clienteId: string): Promise<Visita[]> => {
    try {
      const visitasQuery = query(
        collection(db, 'visitas'),
        where('clienteId', '==', clienteId),
        orderBy('fecha', 'desc'),
        where('completada', '==', true)
      );

      const snapshot = await getDocs(visitasQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Visita));
    } catch (err) {
      console.error('Error al obtener historial:', err);
      toast.error('Error al cargar el historial');
      return [];
    }
  };

  // Actualizar orden manual
  const actualizarOrdenManual = async (nuevoOrden: string[]) => {
    if (!rutaOptimizada) return;

    try {
      const nuevaRuta: RutaOptimizada = {
        ...rutaOptimizada,
        clientes: nuevoOrden.map((clienteId, index) => ({
          clienteId,
          orden: index,
          distanciaAlSiguiente: rutaOptimizada.clientes[index]?.distanciaAlSiguiente,
          tiempoEstimado: rutaOptimizada.clientes[index]?.tiempoEstimado
        }))
      };

      await updateDoc(doc(db, 'rutas', rutaOptimizada.id), {
        clientes: nuevaRuta.clientes,
        fechaActualizacion: serverTimestamp()
      });

      setRutaOptimizada(nuevaRuta);
      toast.success('Orden actualizado correctamente');
    } catch (err) {
      console.error('Error al actualizar orden:', err);
      toast.error('Error al actualizar el orden');
    }
  };

  // Filtrar por zona
  const filtrarPorZona = (zona: string) => {
    setZonaSeleccionada(zona);
    const clientesFiltrados = filterClientesParaHoy(clientes);
    if (clientesFiltrados.length > 0) {
      optimizarRuta(clientesFiltrados);
    }
  };

  // Reoptimizar ruta
  const reoptimizarRuta = async () => {
    if (clientes.length > 0) {
      await optimizarRuta(clientes);
    }
  };

  // Exportar ruta
  const exportarRuta = async (): Promise<Blob> => {
    // Implementación pendiente
    return new Blob();
  };

  // Enviar notificación
  const enviarNotificacion = async (clienteId: string, mensaje: string) => {
    try {
      // Implementación pendiente - se implementará cuando se agregue el sistema de notificaciones
      console.log('Enviando notificación a', clienteId, 'con mensaje:', mensaje);
    } catch (error) {
      console.error('Error al enviar notificación:', error);
      throw error;
    }
  };

  return {
    clientes,
    rutaOptimizada,
    loading,
    optimizing,
    visitasCompletadas,
    error,
    reoptimizarRuta,
    marcarVisita,
    agregarNota,
    obtenerHistorialVisitas,
    actualizarOrdenManual,
    filtrarPorZona,
    exportarRuta,
    enviarNotificacion
  };
}; 