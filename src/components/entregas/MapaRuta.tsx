import React, { useEffect, useRef, useState } from 'react';
import { ClienteConRuta } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface MapaRutaProps {
  clientes: ClienteConRuta[];
  className?: string;
}

interface CustomWindow extends Window {
  google: typeof google;
  initMap: () => void;
}

declare const window: CustomWindow;

export const MapaRuta: React.FC<MapaRutaProps> = ({ clientes, className = '' }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGoogleMaps = () => {
      if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
        setError('API key no configurada');
        setLoading(false);
        return;
      }

      // Verificar si la API ya está cargada
      if (window.google?.maps) {
        initializeMap();
        return;
      }

      // Cargar la API de Google Maps
      window.initMap = initializeMap;
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&callback=initMap`;
      script.async = true;
      script.onerror = () => {
        setError('Error al cargar Google Maps');
        setLoading(false);
      };
      document.head.appendChild(script);

      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        // Limpiar la función initMap
        const customWindow = window as Partial<CustomWindow>;
        if (customWindow.initMap) {
          customWindow.initMap = undefined;
        }
      };
    };

    const initializeMap = async () => {
      if (!mapRef.current || clientes.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const geocoder = new google.maps.Geocoder();
        const bounds = new google.maps.LatLngBounds();
        const map = new google.maps.Map(mapRef.current, {
          zoom: 12,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          mapTypeControl: true,
          streetViewControl: true,
          zoomControl: true,
          scaleControl: true,
        });

        // Geocodificar direcciones y añadir marcadores
        const markers = await Promise.all(
          clientes.map(async (cliente, index) => {
            try {
              const result = await new Promise<google.maps.GeocoderResult>((resolve, reject) => {
                geocoder.geocode(
                  { address: cliente.direccion },
                  (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
                    if (status === 'OK' && results && results[0]) {
                      resolve(results[0]);
                    } else {
                      reject(new Error(`No se pudo geocodificar: ${cliente.direccion}`));
                    }
                  }
                );
              });

              const position = result.geometry.location;
              bounds.extend(position);

              const marker = new google.maps.Marker({
                position,
                map,
                label: (index + 1).toString(),
                title: cliente.nombre,
                animation: google.maps.Animation.DROP,
              });

              // Añadir ventana de información
              const infoWindow = new google.maps.InfoWindow({
                content: `
                  <div class="p-2">
                    <h3 class="font-bold">${cliente.nombre}</h3>
                    <p>${cliente.direccion}</p>
                    <p>Teléfono: ${cliente.telefono}</p>
                    ${cliente.observaciones ? `<p>Notas: ${cliente.observaciones}</p>` : ''}
                  </div>
                `,
              });

              marker.addListener('click', () => {
                infoWindow.open(map, marker);
              });

              return marker;
            } catch (error) {
              console.error(`Error al geocodificar ${cliente.direccion}:`, error);
              return null;
            }
          })
        );

        // Dibujar la ruta entre los puntos
        const directionsService = new google.maps.DirectionsService();
        const directionsRenderer = new google.maps.DirectionsRenderer({
          map,
          suppressMarkers: true, // No mostrar marcadores automáticos
        });

        // Crear waypoints para la ruta
        const validMarkers = markers.filter((marker): marker is google.maps.Marker => marker !== null);
        if (validMarkers.length >= 2) {
          const origin = validMarkers[0].getPosition();
          const destination = validMarkers[validMarkers.length - 1].getPosition();
          
          // Primero filtramos los marcadores que tienen posición válida
          const waypointMarkers = validMarkers
            .slice(1, -1)
            .filter(marker => marker.getPosition() !== null);

          // Luego creamos los waypoints solo con las posiciones válidas
          const waypoints: google.maps.DirectionsWaypoint[] = waypointMarkers
            .map(marker => ({
              location: marker.getPosition() as google.maps.LatLng,
              stopover: true
            }));

          if (origin && destination) {
            const request: google.maps.DirectionsRequest = {
              origin,
              destination,
              waypoints,
              optimizeWaypoints: true,
              travelMode: google.maps.TravelMode.DRIVING,
            };

            directionsService.route(request, (result, status) => {
              if (status === 'OK' && result) {
                directionsRenderer.setDirections(result);
              }
            });
          }
        }

        map.fitBounds(bounds);

        // Ajustar zoom si hay un solo marcador
        if (validMarkers.length === 1) {
          map.setZoom(15);
        }
      } catch (err) {
        console.error('Error al inicializar el mapa:', err);
        setError('Error al inicializar el mapa');
      } finally {
        setLoading(false);
      }
    };

    loadGoogleMaps();
  }, [clientes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
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
    <div
      ref={mapRef}
      className={`w-full h-[400px] rounded-lg shadow-lg ${className}`}
    />
  );
}; 