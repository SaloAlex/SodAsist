import { ClienteConRuta } from '../types';

interface LatLng {
  lat: number;
  lng: number;
}

interface RouteStats {
  distanciaTotal: number;
  tiempoTotal: number;
  distanciasIndividuales: number[];
  tiemposIndividuales: number[];
  horaLlegadaEstimada?: Date;
}

interface DireccionNormalizada {
  original: string;
  normalizada: string;
}

declare global {
  interface Window {
    google: typeof google;
    initMap: () => void;
  }
}

export class RouteOptimizer {
  private static readonly MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  private static geocodeCache = new Map<string, LatLng>();
  // Corregido: 23 waypoints + origen + destino = 25 puntos totales
  private static readonly MAX_WAYPOINTS = 23;
  // Tamaño de lote reducido para evitar rate limits
  private static readonly BATCH_SIZE = 5;
  // Tiempo entre lotes aumentado
  private static readonly BATCH_DELAY = 2000; // 2 segundos

  private static normalizarDireccion(direccion: string): DireccionNormalizada {
    const original = direccion;
    const normalizada = direccion
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
      .replace(/^(av\.|avenida|calle|c\/)\s+/i, "") // Eliminar prefijos comunes
      .replace(/\s+/g, " "); // Normalizar espacios

    return { original, normalizada };
  }

  private static async reintentarOperacion<T>(
    operacion: () => Promise<T>,
    maxIntentos: number = 3,
    delayBase: number = 1000
  ): Promise<T> {
    let ultimoError: Error | null = null;
    
    for (let intento = 1; intento <= maxIntentos; intento++) {
      try {
        return await operacion();
      } catch (error) {
        ultimoError = error as Error;
        const status = (error as google.maps.DirectionsStatus | google.maps.GeocoderStatus);
        
        // Solo reintentar errores específicos
        if (
          status === 'OVER_QUERY_LIMIT' ||
          status === 'UNKNOWN_ERROR'
        ) {
          if (intento < maxIntentos) {
            // Espera exponencial entre intentos
            const delay = delayBase * Math.pow(2, intento - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        throw error;
      }
    }
    
    throw ultimoError || new Error('Error desconocido en reintento');
  }

  static async optimizeRoute(clientes: ClienteConRuta[]): Promise<{
    clientesOrdenados: ClienteConRuta[];
    stats: RouteStats;
  }> {
    try {
      if (!clientes || clientes.length === 0) {
        throw new Error('No hay clientes para optimizar la ruta');
      }

      if (clientes.length === 1) {
        return {
          clientesOrdenados: clientes,
          stats: {
            distanciaTotal: 0,
            tiempoTotal: 0,
            distanciasIndividuales: [0],
            tiemposIndividuales: [0]
          }
        };
      }

      // Validar direcciones
      this.validarDirecciones(clientes);

      console.log('Obteniendo coordenadas para', clientes.length, 'clientes');
      
      // Obtener coordenadas en paralelo con rate limiting
      const clientesConCoordenadas = await this.obtenerCoordenadasParalelo(clientes);

      // Si hay más de MAX_WAYPOINTS waypoints, dividir en subrutas
      if (clientesConCoordenadas.length > this.MAX_WAYPOINTS + 2) {
        return await this.optimizarRutaGrande(clientesConCoordenadas);
      }

      return await this.optimizarRutaSimple(clientesConCoordenadas);
    } catch (error) {
      console.error('Error al optimizar ruta:', error);
      throw error instanceof Error ? error : new Error('Error desconocido al optimizar la ruta');
    }
  }

  private static validarDirecciones(clientes: ClienteConRuta[]): void {
    const direccionesInvalidas = clientes.filter(cliente => !cliente.direccion || cliente.direccion.trim() === '');
    if (direccionesInvalidas.length > 0) {
      throw new Error(`Los siguientes clientes no tienen dirección válida: ${direccionesInvalidas.map(c => c.nombre).join(', ')}`);
    }
  }

  private static async obtenerCoordenadasParalelo(clientes: ClienteConRuta[]): Promise<ClienteConRuta[]> {
    const batches = [];
    
    for (let i = 0; i < clientes.length; i += this.BATCH_SIZE) {
      const batch = clientes.slice(i, i + this.BATCH_SIZE);
      batches.push(batch);
    }

    const clientesConCoordenadas: ClienteConRuta[] = [];
    
    for (const batch of batches) {
      const resultados = await Promise.allSettled(
        batch.map(cliente => this.getCoordinates(cliente.direccion))
      );

      const clientesValidos = resultados.map((resultado, index) => {
        if (resultado.status === 'fulfilled') {
          return { ...batch[index], coords: resultado.value };
        } else {
          console.error(`Error al geocodificar ${batch[index].nombre}:`, resultado.reason);
          return null;
        }
      }).filter((cliente): cliente is ClienteConRuta & { coords: LatLng } => 
        cliente !== null && cliente.coords !== undefined
      );

      clientesConCoordenadas.push(...clientesValidos);

      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, this.BATCH_DELAY));
      }
    }

    if (clientesConCoordenadas.length === 0) {
      throw new Error('No se pudo geocodificar ninguna dirección');
    }

    return clientesConCoordenadas;
  }

  private static async optimizarRutaSimple(clientes: ClienteConRuta[]): Promise<{
    clientesOrdenados: ClienteConRuta[];
    stats: RouteStats;
  }> {
    try {
      const directionsService = new window.google.maps.DirectionsService();

      // Validar que todos los clientes tengan coordenadas
      const clientesConCoordenadas = clientes.filter(cliente => cliente.coords);
      if (clientesConCoordenadas.length !== clientes.length) {
        throw new Error('Algunos clientes no tienen coordenadas válidas');
      }

      const origin = clientesConCoordenadas[0].coords!;
      const destination = clientesConCoordenadas[clientesConCoordenadas.length - 1].coords!;
      const waypoints = clientesConCoordenadas.slice(1, -1).map(cliente => ({
        location: new window.google.maps.LatLng(cliente.coords!.lat, cliente.coords!.lng),
        stopover: true
      }));

      // Calcular hora de salida (2 minutos en el futuro para margen)
      const departureTime = new Date(Date.now() + 2 * 60 * 1000);

      const obtenerRuta = async (opciones: google.maps.DirectionsRequest): Promise<google.maps.DirectionsResult> => {
        return this.reintentarOperacion(() => {
          return new Promise((resolve, reject) => {
            directionsService.route(opciones, (response, status) => {
              if (status === 'OK' && response) {
                resolve(response);
              } else {
                reject(new Error(`Error al obtener la ruta optimizada: ${status}`));
              }
            });
          });
        });
      };

      const opcionesIniciales: google.maps.DirectionsRequest = {
        origin: new window.google.maps.LatLng(origin.lat, origin.lng),
        destination: new window.google.maps.LatLng(destination.lat, destination.lng),
        waypoints: waypoints,
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime,
          trafficModel: google.maps.TrafficModel.BEST_GUESS
        }
      };

      const result = await obtenerRuta(opcionesIniciales);
      const route = result.routes[0];
      const waypointOrder = route.waypoint_order || [];
      
      // Calcular estadísticas
      const stats: RouteStats = {
        distanciaTotal: 0,
        tiempoTotal: 0,
        distanciasIndividuales: [],
        tiemposIndividuales: [],
        horaLlegadaEstimada: new Date(departureTime.getTime())
      };

      route.legs.forEach(leg => {
        const distancia = leg.distance?.value || 0;
        const tiempo = leg.duration?.value || 0;
        stats.distanciasIndividuales.push(distancia);
        stats.tiemposIndividuales.push(tiempo);
        stats.distanciaTotal += distancia;
        stats.tiempoTotal += tiempo;
        
        if (stats.horaLlegadaEstimada) {
          stats.horaLlegadaEstimada = new Date(stats.horaLlegadaEstimada.getTime() + (tiempo * 1000));
        }
      });

      // Ordenar clientes según la ruta optimizada
      const clientesOrdenados = waypoints.length > 0 ? [
        clientesConCoordenadas[0],
        ...waypointOrder.map(index => clientesConCoordenadas[index + 1]),
        clientesConCoordenadas[clientesConCoordenadas.length - 1]
      ] : clientesConCoordenadas;

      return { clientesOrdenados, stats };
    } catch (error) {
      console.error('Error al optimizar ruta simple:', error);
      throw error instanceof Error ? error : new Error('Error desconocido al optimizar la ruta');
    }
  }

  private static async optimizarRutaGrande(clientes: ClienteConRuta[]): Promise<{
    clientesOrdenados: ClienteConRuta[];
    stats: RouteStats;
  }> {
    // Dividir en subrutas de máximo MAX_WAYPOINTS clientes
    const subrutas: ClienteConRuta[][] = [];
    for (let i = 0; i < clientes.length; i += this.MAX_WAYPOINTS) {
      subrutas.push(clientes.slice(i, i + this.MAX_WAYPOINTS));
    }

    // Optimizar cada subruta
    const resultados = await Promise.all(
      subrutas.map(subruta => this.optimizarRutaSimple(subruta))
    );

    // Combinar resultados
    const clientesOrdenados: ClienteConRuta[] = [];
    const stats: RouteStats = {
      distanciaTotal: 0,
      tiempoTotal: 0,
      distanciasIndividuales: [],
      tiemposIndividuales: []
    };

    resultados.forEach(resultado => {
      clientesOrdenados.push(...resultado.clientesOrdenados);
      stats.distanciaTotal += resultado.stats.distanciaTotal;
      stats.tiempoTotal += resultado.stats.tiempoTotal;
      stats.distanciasIndividuales.push(...resultado.stats.distanciasIndividuales);
      stats.tiemposIndividuales.push(...resultado.stats.tiemposIndividuales);
    });

    return { clientesOrdenados, stats };
  }

  private static async getCoordinates(direccion: string): Promise<LatLng> {
    try {
      const { normalizada } = this.normalizarDireccion(direccion);
      
      // Verificar cache con dirección normalizada
      if (this.geocodeCache.has(normalizada)) {
        return this.geocodeCache.get(normalizada)!;
      }

      const geocoder = new window.google.maps.Geocoder();
      
      const geocodificar = async (): Promise<google.maps.GeocoderResult[]> => {
        return new Promise((resolve, reject) => {
          geocoder.geocode(
            { address: direccion },
            (results, status) => {
              if (status === 'OK' && results) {
                resolve(results);
              } else {
                reject(new Error(`Error al geocodificar: ${status}`));
              }
            }
          );
        });
      };

      const results = await this.reintentarOperacion(geocodificar);

      if (results[0].partial_match) {
        console.warn(`⚠️ Coincidencia parcial para la dirección: ${direccion}`);
      }

      const location = results[0].geometry.location;
      const coords = { 
        lat: location.lat(), 
        lng: location.lng() 
      };
      
      this.geocodeCache.set(normalizada, coords);
      return coords;
    } catch (error) {
      console.error('Error al obtener coordenadas:', error);
      throw error instanceof Error ? error : new Error(`Error al geocodificar: ${direccion}`);
    }
  }

  static async getDirectionsUrl(origen: LatLng, destino: LatLng, waypoints?: LatLng[]): Promise<string> {
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origen.lat},${origen.lng}&destination=${destino.lat},${destino.lng}`;
    
    if (waypoints && waypoints.length > 0) {
      const waypointsStr = waypoints
        .map(point => `${point.lat},${point.lng}`)
        .join('|');
      url += `&waypoints=${encodeURIComponent(waypointsStr)}`;
    }

    return url;
  }

  static async getStaticMapUrl(puntos: LatLng[], width: number = 600, height: number = 400): Promise<string> {
    const markers = puntos
      .map((punto, index) => {
        const color = index === 0 ? '0x4CAF50' : 
                     index === puntos.length - 1 ? '0xF44336' : '0x2196F3';
        return `markers=color:${color}%7Clabel:${index + 1}%7C${punto.lat},${punto.lng}`;
      })
      .join('&');

    let path = 'path=color:0x0000ff%7Cweight:5';
    puntos.forEach(punto => {
      path += `%7C${punto.lat},${punto.lng}`;
    });

    return `https://maps.googleapis.com/maps/api/staticmap?size=${width}x${height}&${markers}&${path}&key=${this.MAPS_API_KEY}`;
  }
}