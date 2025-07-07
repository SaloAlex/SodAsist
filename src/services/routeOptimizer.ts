import { ClienteConRuta } from '../types';

interface LatLng {
  lat: number;
  lng: number;
}

interface RouteOptimizationResult {
  optimizedOrder: number[];
  distances: number[];
  durations: number[];
  totalDistance: number;
  totalDuration: number;
}

export class RouteOptimizer {
  private static readonly MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  private static geocodeCache = new Map<string, LatLng>();

  static async optimizeRoute(clientes: ClienteConRuta[]): Promise<ClienteConRuta[]> {
    try {
      // Obtener coordenadas para cada cliente
      const coordenadas = await Promise.all(
        clientes.map(cliente => this.getCoordinates(cliente.direccion))
      );

      // Calcular matriz de distancias
      const distanceMatrix = await this.calculateDistanceMatrix(coordenadas);

      // Optimizar ruta usando el algoritmo del vecino más cercano
      const result = this.nearestNeighborOptimization(distanceMatrix);

      // Reordenar clientes según la optimización
      return result.optimizedOrder.map(index => clientes[index]);
    } catch (error) {
      console.error('Error al optimizar ruta:', error);
      throw new Error('No se pudo optimizar la ruta');
    }
  }

  private static async getCoordinates(direccion: string): Promise<LatLng> {
    // Verificar cache
    if (this.geocodeCache.has(direccion)) {
      return this.geocodeCache.get(direccion)!;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          direccion
        )}&key=${this.MAPS_API_KEY}`
      );

      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        const coords = { lat, lng };
        this.geocodeCache.set(direccion, coords);
        return coords;
      }

      throw new Error(`No se pudo geocodificar la dirección: ${direccion}`);
    } catch (error) {
      console.error('Error al obtener coordenadas:', error);
      throw error;
    }
  }

  private static async calculateDistanceMatrix(
    locations: LatLng[]
  ): Promise<number[][]> {
    try {
      const origins = locations.map(loc => `${loc.lat},${loc.lng}`).join('|');
      const destinations = origins;

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&key=${this.MAPS_API_KEY}`
      );

      const data = await response.json();

      if (data.status === 'OK') {
        return data.rows.map((row: any) =>
          row.elements.map((element: any) => element.distance.value)
        );
      }

      throw new Error('Error al obtener matriz de distancias');
    } catch (error) {
      console.error('Error al calcular matriz de distancias:', error);
      throw error;
    }
  }

  private static nearestNeighborOptimization(
    distanceMatrix: number[][]
  ): RouteOptimizationResult {
    const n = distanceMatrix.length;
    const visited = new Set<number>();
    const optimizedOrder: number[] = [];
    const distances: number[] = [];
    let totalDistance = 0;

    // Comenzar desde el primer punto
    let currentPoint = 0;
    optimizedOrder.push(currentPoint);
    visited.add(currentPoint);

    // Encontrar el vecino más cercano para cada punto restante
    while (visited.size < n) {
      let minDistance = Infinity;
      let nextPoint = -1;

      // Buscar el punto más cercano no visitado
      for (let i = 0; i < n; i++) {
        if (!visited.has(i)) {
          const distance = distanceMatrix[currentPoint][i];
          if (distance < minDistance) {
            minDistance = distance;
            nextPoint = i;
          }
        }
      }

      if (nextPoint !== -1) {
        optimizedOrder.push(nextPoint);
        distances.push(minDistance);
        totalDistance += minDistance;
        visited.add(nextPoint);
        currentPoint = nextPoint;
      }
    }

    // Calcular duración estimada (asumiendo velocidad promedio de 30 km/h)
    const durations = distances.map(distance => (distance / 1000) * (60 / 30)); // minutos
    const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);

    return {
      optimizedOrder,
      distances,
      durations,
      totalDistance,
      totalDuration
    };
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