import { useState, useEffect, useRef, useCallback } from 'react';
import { ClienteConRuta, RutaOptimizada, Visita, EstadoVisita } from '../types';
import { FirebaseService } from '../services/firebaseService';
import { RouteOptimizer } from '../services/routeOptimizer';
import { ExportService, ExportData } from '../services/exportService';
import { collection, query, where, orderBy, getDocs, doc, Timestamp, limit } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
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
  startLocationTracking: () => void;
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
  const { coords: ubicacionActual, error: errorUbicacion, loading: loadingLocation, startLocationTracking } = useGeolocation();
  
  const hasLoadedRef = useRef(false);
  const lastDateRef = useRef<string>('');

  // Función para verificar si cambió el día
  const checkDateChange = useCallback(() => {
    const today = new Date().toDateString();
    if (lastDateRef.current !== today) {
      lastDateRef.current = today;
      setVisitasCompletadas(new Map());
      hasLoadedRef.current = false;
      return true;
    }
    return false;
  }, []);

  // Monitor cambios en geolocalización - solo cuando sea necesario
  useEffect(() => {
    // Solo iniciar geolocalización si no se ha cargado y el usuario está autenticado
    if (!hasLoadedRef.current && userData && !loadingLocation && !ubicacionActual) {
      // Iniciar geolocalización inmediatamente
      startLocationTracking();
    }
  }, [userData, loadingLocation, ubicacionActual, startLocationTracking]);

   

  // Cargar datos solo una vez - SIN mountedRef
  useEffect(() => {
    // No cargar si ya se está cargando o no hay usuario
    if (authLoading || !userData) {
      return;
    }

    // Si ya se cargaron los datos, no hacer nada
    if (hasLoadedRef.current) {
      return;
    }

    const cargarDatos = async () => {
      try {
        setLoading(true);
        setError(null);

        // Verificar si cambió el día ANTES de cargar
        const diaCambio = checkDateChange();
        if (diaCambio) {
          // Día cambió, estado limpiado, continuando carga
        }

        // Permitir acceso a admin, sodero, owner y manager
        if (!['admin', 'sodero', 'owner', 'manager'].includes(userData.rol)) {
          throw new Error(`No tienes permisos para ver esta información. Rol actual: ${userData.rol}`);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        

                 // Obtener clientes usando el servicio de Firebase
         let clientesData: ClienteConRuta[];
         try {
           clientesData = await FirebaseService.getCollection<ClienteConRuta>('clientes');
           
           
         } catch (error) {
           console.error('❌ Error cargando clientes:', error);
           throw error;
         }
        
        // Obtener visitas usando la ruta del tenant
        const user = auth.currentUser;
        if (!user || !user.uid) {
          throw new Error('Usuario no autenticado');
        }


        const visitasQuery = query(
          collection(db, `tenants/${user.uid}/visitas`),
          where('fecha', '>=', Timestamp.fromDate(today)),
          orderBy('fecha', 'desc')
        );
        
        const visitasData = await getDocs(visitasQuery);

                 // Procesar visitas - SOLO las del día actual
         const visitasMap = new Map<string, Visita>();
         

         
         visitasData.docs.forEach(doc => {
           const visita = { id: doc.id, ...doc.data() } as Visita;
           
           // Verificar que la visita sea realmente del día actual
           const visitaDate = visita.fecha instanceof Date ? visita.fecha : new Date(visita.fecha.seconds * 1000);
           const isToday = visitaDate.getDate() === today.getDate() && 
                          visitaDate.getMonth() === today.getMonth() && 
                          visitaDate.getFullYear() === today.getFullYear();
           
           
           
           // SOLO agregar visitas que sean del día actual Y estén completadas
           if (visita.completada && isToday) {
             // Verificar que el cliente exista en la lista actual
             const clienteExiste = clientesData.some(c => c.id === visita.clienteId);
             if (clienteExiste) {
               visitasMap.set(visita.clienteId, visita);
             }
                        }
         });
         

         
         // LIMPIEZA ADICIONAL: Solo mantener visitas de clientes que existen hoy
         const visitasFinales = new Map<string, Visita>();
         visitasMap.forEach((visita, clienteId) => {
           if (clientesData.some(c => c.id === clienteId)) {
             visitasFinales.set(clienteId, visita);
           }
         });
         

         setVisitasCompletadas(visitasFinales);

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
        console.error('❌ useRutaHoy: Error en carga de datos:', err);
        setError(err instanceof Error ? err : new Error('Error desconocido'));
        toast.error('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [authLoading, userData, checkDateChange]);

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
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('Usuario no autenticado');
      }
      
      const visitasQuery = query(
        collection(db, `tenants/${user.email}/visitas`),
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
  
  // Función para limpiar visitas inválidas
  const limpiarVisitasInvalidas = useCallback(() => {
    if (clientes.length === 0) return;
    
    const visitasValidas = new Map<string, Visita>();
    visitasCompletadas.forEach((visita, clienteId) => {
      // Solo mantener visitas de clientes que existen hoy
      if (clientes.some(c => c.id === clienteId)) {
        visitasValidas.set(clienteId, visita);
      }
    });
    
         if (visitasValidas.size !== visitasCompletadas.size) {
       setVisitasCompletadas(visitasValidas);
     }
  }, [clientes, visitasCompletadas]);
  
  // Efecto para limpiar visitas cuando cambian los clientes
  useEffect(() => {
    limpiarVisitasInvalidas();
  }, [clientes, limpiarVisitasInvalidas]);

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
    zonaActual: zonaSeleccionada,
    startLocationTracking
  };
}; 