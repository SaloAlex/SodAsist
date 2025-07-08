import { ClienteConRuta } from '../types';

interface LatLng {
  lat: number;
  lng: number;
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

  static async optimizeRoute(clientes: ClienteConRuta[]): Promise<ClienteConRuta[]> {
    try {
      if (!clientes || clientes.length === 0) {
        throw new Error('No hay clientes para optimizar la ruta');
      }

      if (clientes.length === 1) {
        return clientes;
      }

      // Validar que todas las direcciones sean válidas
      const direccionesInvalidas = clientes.filter(cliente => !cliente.direccion || cliente.direccion.trim() === '');
      if (direccionesInvalidas.length > 0) {
        throw new Error(`Los siguientes clientes no tienen dirección válida: ${direccionesInvalidas.map(c => c.nombre).join(', ')}`);
      }

      console.log('Obteniendo coordenadas para', clientes.length, 'clientes');
      
      // Obtener coordenadas para cada cliente
      const coordenadasPromises = clientes.map(async cliente => {
        try {
          const coords = await this.getCoordinates(cliente.direccion);
          return { cliente, coords, error: null };
        } catch (error) {
          return { cliente, coords: null, error };
        }
      });

      const resultados = await Promise.all(coordenadasPromises);
      
      // Verificar errores de geocodificación
      const erroresGeocoding = resultados.filter(r => r.error);
      if (erroresGeocoding.length > 0) {
        throw new Error(`No se pudieron obtener coordenadas para los clientes: ${erroresGeocoding.map(r => r.cliente.nombre).join(', ')}`);
      }

      // Filtrar clientes con coordenadas válidas
      const clientesConCoordenadas = resultados
        .filter(r => r.coords)
        .map(r => ({ ...r.cliente, coords: r.coords! }));

      console.log('Coordenadas obtenidas correctamente para todos los clientes');

      // Crear el servicio de direcciones
      const directionsService = new window.google.maps.DirectionsService();

      // Preparar waypoints
      const origin = clientesConCoordenadas[0].coords;
      const destination = clientesConCoordenadas[clientesConCoordenadas.length - 1].coords;
      const waypoints = clientesConCoordenadas.slice(1, -1).map(cliente => ({
        location: new window.google.maps.LatLng(cliente.coords.lat, cliente.coords.lng),
        stopover: true
      }));

      console.log('Solicitando optimización de ruta a Google Maps');

      // Obtener la ruta optimizada
      const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        directionsService.route({
          origin: new window.google.maps.LatLng(origin.lat, origin.lng),
          destination: new window.google.maps.LatLng(destination.lat, destination.lng),
          waypoints: waypoints,
          optimizeWaypoints: true,
          travelMode: google.maps.TravelMode.DRIVING,
          region: 'MX', // Optimizar para México
          avoidHighways: false,
          avoidTolls: false
        }, (response, status) => {
          if (status === 'OK' && response) {
            resolve(response);
          } else {
            console.error('Error en DirectionsService:', status);
            reject(new Error(`Error al obtener la ruta optimizada: ${status}`));
          }
        });
      });

      console.log('Ruta optimizada recibida correctamente');

      // Reordenar clientes según la optimización
      const waypointOrder = result.routes[0].waypoint_order;
      const optimizedClientes = [
        clientes[0], // Origen
        ...waypointOrder.map(index => clientes[index + 1]), // Waypoints reordenados
        clientes[clientes.length - 1] // Destino
      ];

      return optimizedClientes;
    } catch (error) {
      console.error('Error al optimizar ruta:', error);
      throw error instanceof Error ? error : new Error('Error desconocido al optimizar la ruta');
    }
  }

  private static async getCoordinates(direccion: string): Promise<LatLng> {
    try {
      // Verificar cache
      if (this.geocodeCache.has(direccion)) {
        return this.geocodeCache.get(direccion)!;
      }

      // Agregar ", México" si no está presente
      const direccionCompleta = direccion.toLowerCase().includes('méxico') ? 
        direccion : 
        `${direccion}, México`;

      const geocoder = new window.google.maps.Geocoder();
      
      return new Promise((resolve, reject) => {
        geocoder.geocode(
          { 
            address: direccionCompleta,
            region: 'MX' // Priorizar resultados en México
          },
          (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
            if (status === 'OK' && results?.[0]) {
              const location = results[0].geometry.location;
              const coords = { 
                lat: location.lat(), 
                lng: location.lng() 
              };
              this.geocodeCache.set(direccion, coords);
              resolve(coords);
            } else {
              reject(new Error(`No se pudo geocodificar la dirección: ${direccion} (${status})`));
            }
          }
        );
      });
    } catch (error) {
      console.error('Error al obtener coordenadas:', error);
      throw error instanceof Error ? error : new Error(`Error al geocodificar: ${direccion}`);
    }
  }

  static async getDirectionsUrl(origen: LatLng, destino: LatLng): Promise<string> {
    return `https://www.google.com/maps/dir/?api=1&origin=${origen.lat},${origen.lng}&destination=${destino.lat},${destino.lng}`;
  }

  static async getStaticMapUrl(puntos: LatLng[], width: number = 600, height: number = 400): Promise<string> {
    const markers = puntos
      .map((punto, index) => `markers=label:${index + 1}|${punto.lat},${punto.lng}`)
      .join('&');

    return `https://maps.googleapis.com/maps/api/staticmap?size=${width}x${height}&${markers}&key=${this.MAPS_API_KEY}`;
  }
}