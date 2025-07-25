import { useState, useEffect, useRef } from 'react';
import { ClienteConRuta, RutaOptimizada, Visita, EstadoVisita } from '../types';
import { FirebaseService } from '../services/firebaseService';
import { RouteOptimizer } from '../services/routeOptimizer';
import { ExportService, ExportData } from '../services/exportService';
import { collection, query, where, orderBy, getDocs, doc, Timestamp, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from '../store/authStore';
import { useGeolocation } from './useGeolocation';
import toast from 'react-hot-toast';

interface UseRutaHoyReturn {
  clientes: ClienteConRuta[];
  rutaOptimizada: RutaOptimizada | null;
  loading: boolean;
  optimizing: boolean;
  visitasCompletadas: Map<string, Visita>;
  error: Error | null;
  ubicacionActual: { lat: number; lng: number; } | null;
  errorUbicacion: string | null;
  reoptimizarRuta: () => Promise<void>;
  marcarVisita: (clienteId: string, estado: EstadoVisita) => Promise<void>;
  agregarNota: (clienteId: string, nota: string) => Promise<void>;
  obtenerHistorialVisitas: (clienteId: string) => Promise<Visita[]>;
  actualizarOrdenManual: (nuevoOrden: string[]) => Promise<void>;
  filtrarPorZona: (zona: string) => void;
  exportarRuta: () => Promise<Blob>;
  enviarNotificacion: (clienteId: string, mensaje: string) => Promise<void>;
  zonaActual: string | null;
}

export const useRutaHoy = (): UseRutaHoyReturn => {
  const [clientes, setClientes] = useState<ClienteConRuta[]>([]);
  const [rutaOptimizada, setRutaOptimizada] = useState<RutaOptimizada | null>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [visitasCompletadas, setVisitasCompletadas] = useState<Map<string, Visita>>(new Map());
  const [error, setError] = useState<Error | null>(null);
  const [zonaSeleccionada, setZonaSeleccionada] = useState<string | null>(null);

  const { userData, loading: authLoading } = useAuthStore();
  
  // Integrar geolocalización de forma segura
  const { coords: ubicacionActual, error: errorUbicacion, loading: loadingLocation } = useGeolocation();
  
  const hasLoadedRef = useRef(false);

  // Monitor cambios en geolocalización - solo para desarrollo
  useEffect(() => {
    if (ubicacionActual && !hasLoadedRef.current) {
      // Ubicación obtenida correctamente
    }
  }, [ubicacionActual, errorUbicacion, loadingLocation]);

  // Cargar datos solo una vez - SIN mountedRef
  useEffect(() => {
    if (hasLoadedRef.current || authLoading || !userData) {
      return;
    }

    const cargarDatos = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!['admin', 'sodero'].includes(userData.rol)) {
          throw new Error('No tienes permisos para ver esta información');
        }

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

        // Filtrar clientes para hoy
        const today2 = new Date();
        const dayOfWeek = today2.getDay();
        const dayOfMonth = today2.getDate();
        const weekOfYear = Math.ceil(dayOfMonth / 7);
        
        const daysMap: Record<number, string> = {
          0: 'domingo', 1: 'lunes', 2: 'martes', 3: 'miércoles',
          4: 'jueves', 5: 'viernes', 6: 'sábado'
        };
        
        const todayName = daysMap[dayOfWeek];
        
        const clientesFiltrados = clientesData.filter(cliente => {
          if (cliente.diaVisita !== todayName) return false;
          
          switch (cliente.frecuenciaVisita) {
            case 'semanal': return true;
            case 'quincenal': return weekOfYear % 2 === 1;
            case 'mensual': return dayOfMonth <= 7;
            default: return false;
          }
        });

        setClientes(clientesFiltrados);

        // Crear ruta básica
        if (clientesFiltrados.length > 0) {
          const rutaBase: RutaOptimizada = {
            id: doc(collection(db, 'rutas')).id,
            fecha: new Date(),
            clientes: clientesFiltrados.map((cliente, index) => ({
              clienteId: cliente.id!,
              orden: index,
              distanciaAlSiguiente: 0,
              tiempoEstimado: 0
            })),
            distanciaTotal: 0,
            tiempoEstimadoTotal: 0,
            zonas: Array.from(new Set(clientesFiltrados.map(c => c.zona).filter(Boolean))) as string[]
          };
          setRutaOptimizada(rutaBase);
        }

        hasLoadedRef.current = true;

      } catch (err) {
        setError(err instanceof Error ? err : new Error('Error desconocido'));
        toast.error('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [authLoading, userData]);

  // Funciones implementadas
  const reoptimizarRuta = async () => {
    try {
      if (clientes.length === 0) {
        toast.error('No hay clientes para optimizar');
        return;
      }

      // Activar estado de optimización
      setOptimizing(true);
      
      // Mostrar toast de carga
      const loadingToast = toast.loading('Optimizando ruta...', { duration: Infinity });

      // Filtrar solo clientes no completados
      const clientesPendientes = clientes.filter(cliente => 
        !visitasCompletadas.has(cliente.id!)
      );

      if (clientesPendientes.length === 0) {
        toast.dismiss(loadingToast);
        toast.success('¡Todos los clientes ya han sido visitados!');
        return;
      }

      // Usar ubicación actual si está disponible
      const options = ubicacionActual ? {
        ubicacionInicial: ubicacionActual
      } : {};

      // Optimizar la ruta
      const resultado = await RouteOptimizer.optimizeRoute(clientesPendientes, options);
      
      // Actualizar el estado con la ruta optimizada
      const rutaOptimizada: RutaOptimizada = {
        id: doc(collection(db, 'rutas')).id,
        fecha: new Date(),
        clientes: resultado.clientesOrdenados.map((cliente, index) => ({
          clienteId: cliente.id!,
          orden: index,
          distanciaAlSiguiente: resultado.stats.distanciasIndividuales[index] || 0,
          tiempoEstimado: resultado.stats.tiemposIndividuales[index] || 0
        })),
        distanciaTotal: resultado.stats.distanciaTotal,
        tiempoEstimadoTotal: resultado.stats.tiempoTotal,
        zonas: Array.from(new Set(resultado.clientesOrdenados.map(c => c.zona).filter(Boolean))) as string[]
      };

      // Actualizar estados
      setClientes(resultado.clientesOrdenados);
      setRutaOptimizada(rutaOptimizada);

      // Mostrar estadísticas
      const distanciaKm = (resultado.stats.distanciaTotal / 1000).toFixed(1);
      const tiempoHoras = Math.floor(resultado.stats.tiempoTotal / 3600);
      const tiempoMinutos = Math.floor((resultado.stats.tiempoTotal % 3600) / 60);

      toast.dismiss(loadingToast);
      
      if (ubicacionActual) {
        toast.success(
          `🚗 Ruta optimizada desde tu ubicación\n` +
          `📏 Distancia: ${distanciaKm} km\n` +
          `⏱️ Tiempo estimado: ${tiempoHoras}h ${tiempoMinutos}m`,
          { duration: 6000 }
        );
      } else {
        toast.success(
          `🚗 Ruta optimizada\n` +
          `📏 Distancia: ${distanciaKm} km\n` +
          `⏱️ Tiempo estimado: ${tiempoHoras}h ${tiempoMinutos}m`,
          { duration: 6000 }
        );
      }

    } catch (err) {
      
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      
      if (errorMessage.includes('OVER_QUERY_LIMIT')) {
        toast.error('Límite de consultas excedido. Intenta más tarde.');
      } else if (errorMessage.includes('REQUEST_DENIED')) {
        toast.error('Error de permisos de Google Maps. Verifica la configuración.');
      } else if (errorMessage.includes('geocodificar')) {
        toast.error('Error al obtener coordenadas de algunas direcciones.');
      } else {
        toast.error('Error al optimizar la ruta: ' + errorMessage);
      }
    } finally {
      // Siempre desactivar estado de optimización
      setOptimizing(false);
    }
  };

  const marcarVisita = async (clienteId: string, estado: EstadoVisita) => {
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
      
      // Usar ubicación real si está disponible
      let ubicacionCompletado = { lat: 0, lng: 0 };
      if (ubicacionActual) {
        ubicacionCompletado = {
          lat: ubicacionActual.lat,
          lng: ubicacionActual.lng
        };
      } else {
        if (errorUbicacion) {
          toast('No se pudo obtener tu ubicación actual', {
            icon: '⚠️',
            duration: 4000
          });
        }
      }
      
      const visitaData = {
        id: visitaId,
        clienteId,
        completada: estado === EstadoVisita.COMPLETADA,
        tiempoVisita: 0,
        ubicacionCompletado,
        fecha: new Date()
      };

      await FirebaseService.createDocument('visitas', visitaData);

      if (estado === EstadoVisita.COMPLETADA) {
        const visitaCompleta: Visita = {
          ...visitaData,
          fecha: {
            seconds: Math.floor(Date.now() / 1000),
            nanoseconds: 0
          }
        };
        setVisitasCompletadas(prev => new Map(prev).set(clienteId, visitaCompleta));
        
        // Mensaje diferente dependiendo si tenemos ubicación
        if (ubicacionActual) {
          toast.success('Visita completada con ubicación registrada');
        } else {
          toast.success('Visita completada (sin ubicación)');
        }
      } else {
        setVisitasCompletadas(prev => {
          const newMap = new Map(prev);
          newMap.delete(clienteId);
          return newMap;
        });
        toast.success(`Visita marcada como ${estado}`);
      }
    } catch {
      toast.error('Error al marcar la visita');
    }
  };

  const agregarNota = async (clienteId: string, nota: string) => {
    try {
      const visitaExistente = visitasCompletadas.get(clienteId);
      if (!visitaExistente) {
        toast.error('Primero debe marcar la visita como completada');
        return;
      }

      await FirebaseService.updateDocument('visitas', visitaExistente.id, {
        notas: nota
      });

      const visitaActualizada = {
        ...visitaExistente,
        notas: nota
      };

      setVisitasCompletadas(prev => new Map(prev).set(clienteId, visitaActualizada));
      toast.success('Nota agregada correctamente');
    } catch {
      toast.error('Error al agregar la nota');
    }
  };

  const obtenerHistorialVisitas = async (clienteId: string): Promise<Visita[]> => {
    try {
      const visitasQuery = query(
        collection(db, 'visitas'),
        where('clienteId', '==', clienteId),
        orderBy('fecha', 'desc'),
        limit(10)
      );

      const querySnapshot = await getDocs(visitasQuery);
      const visitas = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Visita));
      
      return visitas;
    } catch {
      toast.error('Error al obtener el historial');
      return [];
    }
  };

  const actualizarOrdenManual = async (nuevoOrden: string[]) => {
    try {
      
      // Reordenar los clientes según el nuevo orden
      const clientesOrdenados = nuevoOrden.map(id => 
        clientes.find(c => c.id === id)!
      ).filter(Boolean);
      
      setClientes(clientesOrdenados);

      // Actualizar la ruta si existe
      if (rutaOptimizada) {
        const rutaActualizada: RutaOptimizada = {
          ...rutaOptimizada,
          clientes: nuevoOrden.map((id, index) => ({
            clienteId: id,
            orden: index,
            distanciaAlSiguiente: rutaOptimizada.clientes[index]?.distanciaAlSiguiente || 0,
            tiempoEstimado: rutaOptimizada.clientes[index]?.tiempoEstimado || 0
          }))
        };

        setRutaOptimizada(rutaActualizada);
        toast.success('Orden de ruta actualizado');
      }
    } catch {
      toast.error('Error al actualizar el orden de la ruta');
    }
  };

  const filtrarPorZona = (zona: string) => {
    setZonaSeleccionada(zona || null);
    // TODO: Implementar refiltrado de clientes
  };

  const exportarRuta = async (): Promise<Blob> => {
    try {
      const exportData: ExportData = {
        clientes,
        rutaOptimizada,
        visitasCompletadas,
        ubicacionActual,
        fechaRuta: new Date(),
        sodero: userData?.nombre || 'Sodero'
      };

      // Por defecto exportamos el reporte completo en PDF
      const blob = await ExportService.exportToPDF(exportData);
      toast.success('Reporte exportado exitosamente');
      return blob;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error al exportar:', error);
      }
      toast.error('Error al generar el reporte');
      return new Blob(['Error al generar el reporte'], { type: 'text/plain' });
    }
  };

  const enviarNotificacion = async () => {
    toast.success('Función de notificaciones pendiente');
  };

  return {
    clientes,
    rutaOptimizada,
    loading,
    optimizing,
    visitasCompletadas,
    error,
    ubicacionActual, // Ahora devuelve la ubicación real
    errorUbicacion, // Ahora devuelve el error real
    reoptimizarRuta,
    marcarVisita,
    agregarNota,
    obtenerHistorialVisitas,
    actualizarOrdenManual,
    filtrarPorZona,
    exportarRuta,
    enviarNotificacion,
    zonaActual: zonaSeleccionada
  };
}; 