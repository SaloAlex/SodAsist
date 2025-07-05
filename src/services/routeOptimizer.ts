import { Cliente } from '../types';

interface RoutePoint {
  lat: number;
  lng: number;
  cliente: Cliente;
}

export class RouteOptimizer {
  private static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  static async optimizeRoute(clientes: Cliente[], startLat: number = -34.6037, startLng: number = -58.3816): Promise<Cliente[]> {
    if (clientes.length === 0) return [];
    
    // Filter clients with coordinates
    const clientesConCoords = clientes.filter(c => c.lat && c.lng);
    
    if (clientesConCoords.length === 0) return clientes;

    // Simple nearest neighbor algorithm
    const points: RoutePoint[] = clientesConCoords.map(c => ({
      lat: c.lat!,
      lng: c.lng!,
      cliente: c
    }));

    const optimizedRoute: Cliente[] = [];
    let currentLat = startLat;
    let currentLng = startLng;
    let remainingPoints = [...points];

    while (remainingPoints.length > 0) {
      let nearestIndex = 0;
      let minDistance = this.calculateDistance(currentLat, currentLng, remainingPoints[0].lat, remainingPoints[0].lng);

      for (let i = 1; i < remainingPoints.length; i++) {
        const distance = this.calculateDistance(currentLat, currentLng, remainingPoints[i].lat, remainingPoints[i].lng);
        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = i;
        }
      }

      const nearestPoint = remainingPoints[nearestIndex];
      optimizedRoute.push(nearestPoint.cliente);
      currentLat = nearestPoint.lat;
      currentLng = nearestPoint.lng;
      remainingPoints.splice(nearestIndex, 1);
    }

    // Add clients without coordinates at the end
    const clientesSinCoords = clientes.filter(c => !c.lat || !c.lng);
    optimizedRoute.push(...clientesSinCoords);

    return optimizedRoute;
  }

  static async getMapboxRoute(clientes: Cliente[]): Promise<any> {
    const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    if (!accessToken) {
      console.warn('Mapbox access token not configured');
      return null;
    }

    const coordinates = clientes
      .filter(c => c.lat && c.lng)
      .map(c => `${c.lng},${c.lat}`)
      .join(';');

    if (!coordinates) return null;

    try {
      const response = await fetch(
        `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordinates}?access_token=${accessToken}&overview=full&geometries=geojson`
      );
      
      if (!response.ok) throw new Error('Mapbox API error');
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching Mapbox route:', error);
      return null;
    }
  }
}