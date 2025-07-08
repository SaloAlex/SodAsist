import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { GoogleMap, DirectionsRenderer, InfoWindow } from '@react-google-maps/api';
import { ClienteConRuta } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface MapaRutaProps {
  clientes: ClienteConRuta[];
  className?: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
};

const mapOptions = {
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
  ]
};

// Definir los límites geográficos por país
const COUNTRY_BOUNDS = {
  'Argentina': {
    sw: { lat: -55.0577, lng: -73.5604 }, // Punto más al suroeste de Argentina
    ne: { lat: -21.7799, lng: -53.6374 }  // Punto más al noreste de Argentina
  },
  'México': {
    sw: { lat: 14.5321, lng: -118.4011 }, // Punto más al suroeste de México
    ne: { lat: 32.7187, lng: -86.5924 }   // Punto más al noreste de México
  }
  // Agregar más países según sea necesario
};

// Función para formatear la dirección
const formatearDireccion = (cliente: ClienteConRuta) => {
  const partes = [];
  
  // Agregar cada parte de la dirección si existe
  if (cliente.direccion) partes.push(cliente.direccion);
  if (cliente.colonia) partes.push(cliente.colonia);
  if (cliente.ciudad) partes.push(cliente.ciudad);
  if (cliente.estado) partes.push(cliente.estado);
  if (cliente.codigoPostal) partes.push(cliente.codigoPostal);
  
  // Agregar el país (por defecto Argentina si no está especificado)
  const pais = cliente.pais || 'Argentina';
  partes.push(pais);
  
  return {
    direccionCompleta: partes.join(', '),
    pais
  };
};

export const MapaRuta: React.FC<MapaRutaProps> = React.memo(({ clientes, className = '' }) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<ClienteConRuta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const calculationInProgress = useRef(false);
  const previousIdsRef = useRef<string[]>([]);
  const previousDirectionsRef = useRef<google.maps.DirectionsResult | null>(null);

  // Memoizar las opciones del mapa
  const options = useMemo(() => ({
    ...mapOptions,
    gestureHandling: 'cooperative',
  }), []);

  // Memoizar el centro inicial
  const initialCenter = useMemo(() => ({ 
    lat: -34.6037, 
    lng: -58.3816  // Centro de Buenos Aires
  }), []);

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

  const calculateRoute = useCallback(async (clientesActuales: ClienteConRuta[]) => {
    if (!map || !window.google) return;
    if (clientesActuales.length < 1) return;

    try {
      calculationInProgress.current = true;
      setLoading(true);
      setError(null);
      clearMarkers();

      const geocoder = new google.maps.Geocoder();
      const directionsService = new google.maps.DirectionsService();
      const bounds = new google.maps.LatLngBounds();

      // Geocodificar direcciones
      const locations = await Promise.all(
        clientesActuales.map(async (cliente, index) => {
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
                  const location = results[0].geometry.location;
                  
                  if (countryBounds) {
                    const lat = location.lat();
                    const lng = location.lng();
                    const isWithinBounds = 
                      lat >= countryBounds.sw.lat && lat <= countryBounds.ne.lat &&
                      lng >= countryBounds.sw.lng && lng <= countryBounds.ne.lng;

                    if (!isWithinBounds) {
                      reject(new Error(`La ubicación encontrada está fuera de ${pais}: ${direccionCompleta}`));
                      return;
                    }
                  }

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

      // Verificar si la ruta ha cambiado antes de actualizar el estado
      const routeChanged = !previousDirectionsRef.current || 
        JSON.stringify(result.routes[0].overview_path) !== 
        JSON.stringify(previousDirectionsRef.current.routes[0].overview_path);

      if (routeChanged) {
        previousDirectionsRef.current = result;
        setDirections(result);

        // Mostrar información de la ruta
        const route = result.routes[0];
        const totalDistance = route.legs.reduce((acc, leg) => acc + (leg.distance?.value || 0), 0);
        const totalDuration = route.legs.reduce((acc, leg) => acc + (leg.duration?.value || 0), 0);

        const infoDiv = document.createElement('div');
        infoDiv.className = 'bg-white p-2 rounded shadow absolute bottom-4 left-4 z-10';
        infoDiv.innerHTML = `
          <p class="font-semibold">Información de la ruta:</p>
          <p>Distancia total: ${(totalDistance / 1000).toFixed(1)} km</p>
          <p>Tiempo estimado: ${Math.round(totalDuration / 60)} minutos</p>
        `;

        map.controls[google.maps.ControlPosition.LEFT_BOTTOM].clear();
        map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(infoDiv);
      }

    } catch (err) {
      console.error('Error al calcular la ruta:', err);
      setError(err instanceof Error ? err.message : 'Error al calcular la ruta');
    } finally {
      setLoading(false);
      calculationInProgress.current = false;
    }
  }, [map, createMarkerElement, clearMarkers]);

  // Efecto para calcular la ruta solo cuando cambian los IDs de los clientes
  useEffect(() => {
    if (!map) return;
    if (calculationInProgress.current) return;

    // Verificar si realmente cambió la lista de clientes
    const ids = clientes.map(c => c.id!).sort();
    if (
      ids.length === previousIdsRef.current.length &&
      ids.every((id, i) => id === previousIdsRef.current[i])
    ) {
      return; // mismos clientes, no recalculamos
    }
    previousIdsRef.current = ids;

    calculateRoute(clientes);
  }, [map, clientes, calculateRoute]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      clearMarkers();
      if (map) {
        map.controls[google.maps.ControlPosition.LEFT_BOTTOM].clear();
      }
    };
  }, [map, clearMarkers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
        <p className="ml-2">Calculando ruta...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        {error}
      </div>
    );
  }

  if (clientes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No hay clientes para mostrar en el mapa
      </div>
    );
  }

  return (
    <div className={`rounded-lg shadow-lg overflow-hidden ${className}`}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={initialCenter}
        zoom={12}
        onLoad={setMap}
        onUnmount={() => setMap(null)}
        options={options}
      >
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#4A90E2',
                strokeWeight: 4,
              }
            }}
          />
        )}

        {selectedCliente && map && (
          <InfoWindow
            position={markersRef.current.find(marker => 
              marker.title === selectedCliente.nombre
            )?.position as google.maps.LatLng | undefined}
            onCloseClick={() => setSelectedCliente(null)}
          >
            <div className="p-2">
              <h3 className="font-bold">{selectedCliente.nombre}</h3>
              <p>{selectedCliente.direccion}</p>
              <p>Teléfono: {selectedCliente.telefono}</p>
              {selectedCliente.observaciones && (
                <p>Notas: {selectedCliente.observaciones}</p>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
});