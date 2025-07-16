import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, DirectionsRenderer, InfoWindow } from '@react-google-maps/api';
import { ClienteConRuta } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface MapaRutaProps {
  clientes: ClienteConRuta[];
  className?: string;
  onClienteClick?: (cliente: ClienteConRuta) => void;
  mostrarEstadisticas?: boolean;
}

interface EstadisticasRuta {
  distanciaTotal: string;
  tiempoTotal: string;
  paradas: number;
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
};

const mapOptions = {
  mapId: 'sodaasist_delivery_map', // Agregar ID único del mapa
  mapTypeControl: true,
  streetViewControl: true,
  zoomControl: true,
  scaleControl: true,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ],
  gestureHandling: 'cooperative',
};

// Definir los límites geográficos por país
const COUNTRY_BOUNDS = {
  'México': {
    sw: { lat: 14.5321, lng: -118.4011 },
    ne: { lat: 32.7187, lng: -86.5924 }
  }
};

// Función para formatear la dirección
const formatearDireccion = (cliente: ClienteConRuta) => {
  // Construir la dirección parte por parte
  let direccionCompleta = cliente.direccion || '';
  
  if (cliente.direccionDetalles) {
    const detalles = cliente.direccionDetalles;
    if (detalles.colonia) direccionCompleta += `, ${detalles.colonia}`;
    if (detalles.ciudad) direccionCompleta += `, ${detalles.ciudad}`;
    if (detalles.estado) direccionCompleta += `, ${detalles.estado}`;
    if (detalles.codigoPostal) direccionCompleta += `, ${detalles.codigoPostal}`;
  }
  
  const pais = cliente.direccionDetalles?.pais || 'México';
  direccionCompleta += `, ${pais}`;
  
  return {
    direccionCompleta: direccionCompleta.replace(/^, /, ''),
    pais
  };
};

// Función para formatear tiempo
const formatearTiempo = (minutos: number): string => {
  const horas = Math.floor(minutos / 60);
  const minutosRestantes = Math.round(minutos % 60);
  return horas > 0 ? 
    `${horas}h ${minutosRestantes}min` : 
    `${minutosRestantes}min`;
};

// Función para formatear distancia
const formatearDistancia = (metros: number): string => {
  return metros >= 1000 ? 
    `${(metros / 1000).toFixed(1)}km` : 
    `${metros}m`;
};

export const MapaRuta: React.FC<MapaRutaProps> = React.memo(({ 
  clientes, 
  className = '',
  onClienteClick,
  mostrarEstadisticas = true
}) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<ClienteConRuta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estadisticas, setEstadisticas] = useState<EstadisticasRuta | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const calculationInProgress = useRef(false);
  const previousIdsRef = useRef<string[]>([]);

  // Eliminar el centro inicial fijo
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral | null>(null);

  // Función para crear el contenido del marcador
  const createMarkerElement = useCallback((index: number, color: string) => {
    const div = document.createElement('div');
    div.className = 'marker-container';
    div.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: ${color};
      color: white;
      font-size: 14px;
      font-weight: bold;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    `;
    div.textContent = (index + 1).toString();
    return div;
  }, []);

  // Función para limpiar marcadores
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => {
      if (marker) {
        marker.map = null;
      }
    });
    markersRef.current = [];
  }, []);

  // Función para calcular estadísticas
  const calcularEstadisticas = useCallback((result: google.maps.DirectionsResult): EstadisticasRuta => {
    const route = result.routes[0];
    const distanciaTotal = route.legs.reduce((acc, leg) => acc + (leg.distance?.value || 0), 0);
    const tiempoTotal = route.legs.reduce((acc, leg) => acc + (leg.duration?.value || 0), 0);

    return {
      distanciaTotal: formatearDistancia(distanciaTotal),
      tiempoTotal: formatearTiempo(tiempoTotal / 60), // Convertir segundos a minutos
      paradas: route.legs.length
    };
  }, []);

  // Función principal para calcular la ruta
  const calculateRoute = useCallback(async (clientesActuales: ClienteConRuta[]) => {
    if (!map || !window.google || clientesActuales.length < 1) return;
    if (calculationInProgress.current) return;

    const currentIds = clientesActuales.map(c => c.id || '').filter(Boolean);
    if (currentIds.join(',') === previousIdsRef.current.join(',')) return;

    try {
      calculationInProgress.current = true;
      setLoading(true);
      setError(null);
      clearMarkers();

      const geocoder = new google.maps.Geocoder();
      const directionsService = new google.maps.DirectionsService();
      const bounds = new google.maps.LatLngBounds();

      // Geocodificar direcciones
      const locations: google.maps.LatLng[] = await Promise.all(
        clientesActuales.map(async (cliente, index) => {
          // Si ya tenemos coordenadas, usarlas
          if (cliente.coords) {
            const position = new google.maps.LatLng(cliente.coords.lat, cliente.coords.lng);
            bounds.extend(position);
            return position;
          }

          const { direccionCompleta, pais } = formatearDireccion(cliente);
          const countryBounds = COUNTRY_BOUNDS[pais as keyof typeof COUNTRY_BOUNDS];

          const result = await new Promise<google.maps.GeocoderResult>((resolve, reject) => {
            geocoder.geocode(
              {
                address: direccionCompleta,
                region: pais === 'México' ? 'MX' : 'AR',
                ...(countryBounds && {
                  bounds: new google.maps.LatLngBounds(
                    new google.maps.LatLng(countryBounds.sw.lat, countryBounds.sw.lng),
                    new google.maps.LatLng(countryBounds.ne.lat, countryBounds.ne.lng)
                  )
                })
              },
              (results, status) => {
                if (status === 'OK' && results?.[0]) {
                  resolve(results[0]);
                } else {
                  reject(new Error(`No se pudo geocodificar: ${direccionCompleta} (${status})`));
                }
              }
            );
          });

          const position = result.geometry.location;
          bounds.extend(position);

          // Crear marcador
          const color = index === 0 ? '#4CAF50' : 
                       index === clientesActuales.length - 1 ? '#F44336' : '#2196F3';

          const marker = new google.maps.marker.AdvancedMarkerElement({
            map,
            position,
            title: cliente.nombre,
            content: createMarkerElement(index, color)
          });

          marker.addListener('click', () => {
            setSelectedCliente(cliente);
            if (onClienteClick) {
              onClienteClick(cliente);
            }
          });

          markersRef.current.push(marker);
          return position;
        })
      );

      // Ajustar el mapa a los marcadores
      map.fitBounds(bounds);

      // Si solo hay un cliente, hacer zoom apropiado
      if (clientesActuales.length === 1) {
        map.setZoom(15);
        return;
      }

      // Calcular la ruta
      const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        directionsService.route(
          {
            origin: locations[0],
            destination: locations[locations.length - 1],
            waypoints: locations.slice(1, -1).map(location => ({
              location,
              stopover: true
            })),
            optimizeWaypoints: true,
            travelMode: google.maps.TravelMode.DRIVING,
            drivingOptions: {
              departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Mañana a esta hora
              trafficModel: google.maps.TrafficModel.BEST_GUESS
            }
          },
          (response, status) => {
            if (status === 'OK' && response) {
              resolve(response);
            } else {
              reject(new Error(`Error al calcular la ruta: ${status}`));
            }
          }
        );
      });

      setDirections(result);
      setEstadisticas(calcularEstadisticas(result));
      previousIdsRef.current = clientesActuales.map(c => c.id || '').filter(Boolean);

    } catch (err) {
      console.error('Error al calcular ruta:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
      calculationInProgress.current = false;
    }
  }, [map, clearMarkers, createMarkerElement, calcularEstadisticas, onClienteClick]);

  // Efecto para recalcular la ruta cuando cambian los clientes
  useEffect(() => {
    if (clientes.length > 0) {
      calculateRoute(clientes);
    } else {
      clearMarkers();
      setDirections(null);
      setEstadisticas(null);
    }
  }, [clientes, calculateRoute, clearMarkers]);

  // Efecto para establecer el centro del mapa basado en los clientes
  useEffect(() => {
    if (clientes.length > 0 && map) {
      const bounds = new google.maps.LatLngBounds();
      
      clientes.forEach(cliente => {
        if (cliente.coords) {
          bounds.extend(new google.maps.LatLng(cliente.coords.lat, cliente.coords.lng));
        }
      });
      
      map.fitBounds(bounds);
      
      // Si solo hay un cliente, hacer zoom apropiado
      if (clientes.length === 1 && clientes[0].coords) {
        setMapCenter(clientes[0].coords);
        map.setZoom(15);
      }
    }
  }, [clientes, map]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      clearMarkers();
    };
  }, [clearMarkers]);

  // Renderizar el mapa
  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
          <LoadingSpinner />
        </div>
      )}
      
      {error && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white p-2 text-center">
          {error}
        </div>
      )}

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter || undefined}
        options={mapOptions}
        onLoad={setMap}
      >
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#2196F3',
                strokeWeight: 5,
                strokeOpacity: 0.8
              }
            }}
          />
        )}

        {selectedCliente && (
          <InfoWindow
            position={selectedCliente.coords || undefined}
            onCloseClick={() => setSelectedCliente(null)}
          >
            <div className="p-2">
              <h3 className="font-bold">{selectedCliente.nombre}</h3>
              <p>{selectedCliente.direccion}</p>
              {selectedCliente.telefono && (
                <p className="mt-1">
                  <a 
                    href={`tel:${selectedCliente.telefono}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {selectedCliente.telefono}
                  </a>
                </p>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {mostrarEstadisticas && estadisticas && (
        <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-md">
          <h4 className="font-semibold mb-2">Información de la ruta:</h4>
          <div className="space-y-1 text-sm">
            <p>Distancia total: {estadisticas.distanciaTotal}</p>
            <p>Tiempo estimado: {estadisticas.tiempoTotal}</p>
            <p>Paradas: {estadisticas.paradas}</p>
          </div>
        </div>
      )}
    </div>
  );
});

MapaRuta.displayName = 'MapaRuta';