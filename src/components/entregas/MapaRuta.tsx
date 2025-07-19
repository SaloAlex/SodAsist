import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGoogleMaps } from '../common/GoogleMapsProvider';
import { useGeolocation } from '../../hooks/useGeolocation';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ClienteConRuta } from '../../types';
import { IniciarRuta } from './IniciarRuta';

interface MapaRutaProps {
  clientes: ClienteConRuta[];
  className?: string;
  onClienteClick?: (cliente: ClienteConRuta) => void;
  onUpdateCliente?: (clienteId: string, estado: 'pendiente' | 'completado' | 'cancelado') => void;
}

interface GeolocationCoordinatesLike {
  latitude: number;
  longitude: number;
}

export const MapaRuta: React.FC<MapaRutaProps> = ({
  clientes: clientesIniciales,
  className = '',
  onClienteClick,
  onUpdateCliente
}) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientes, setClientes] = useState(clientesIniciales);
  const geolocation = useGeolocation();
  const ubicacionActual = geolocation.coords as GeolocationCoordinatesLike | null;
  const { isLoaded, loadError } = useGoogleMaps();
  const [markerLibLoaded, setMarkerLibLoaded] = useState(false);

  // Función para validar coordenadas
  const isValidLatLng = useCallback((coords: { lat?: number; lng?: number } | null | undefined): boolean => {
    if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
      console.warn('Coordenadas no son números válidos:', coords);
      return false;
    }

    if (coords.lat < -90 || coords.lat > 90 || coords.lng < -180 || coords.lng > 180) {
      console.warn('Coordenadas fuera de rango:', coords);
      return false;
    }

    return true;
  }, []);

  // Función para crear un LatLng válido
  const createLatLng = useCallback((coords: { lat?: number; lng?: number } | null | undefined): google.maps.LatLng | null => {
    try {
      if (!isValidLatLng(coords)) return null;
      return new google.maps.LatLng({
        lat: coords!.lat!,
        lng: coords!.lng!
      });
    } catch (error) {
      console.error('Error al crear LatLng:', error);
      return null;
    }
  }, [isValidLatLng]);

  // Función para crear el contenido del marcador
  const createMarkerContent = useCallback((cliente: ClienteConRuta, index: number): HTMLElement => {
    // Crear el contenedor del marcador
    const container = document.createElement('div');
    container.style.position = 'relative';

    // Crear el contenido del marcador
    const markerContent = document.createElement('div');
    markerContent.className = 'marker-content';
    markerContent.style.cssText = `
      width: 36px;
      height: 36px;
      background-color: ${cliente.estado === 'completado' ? '#10B981' : '#3B82F6'};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 14px;
      font-weight: bold;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    `;
    markerContent.textContent = (index + 1).toString();

    // Crear el tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'marker-tooltip';
    tooltip.style.cssText = `
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      padding: 4px 8px;
      background-color: white;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      font-size: 12px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
    `;
    tooltip.textContent = cliente.nombre;

    container.appendChild(markerContent);
    container.appendChild(tooltip);

    // Agregar eventos de hover con passive: true
    container.addEventListener('mouseenter', () => {
      tooltip.style.opacity = '1';
    }, { passive: true });
    
    container.addEventListener('mouseleave', () => {
      tooltip.style.opacity = '0';
    }, { passive: true });

    return container;
  }, []);

  // Efecto para actualizar clientes cuando cambian los iniciales
  useEffect(() => {
    const clientesString = JSON.stringify(clientesIniciales);
    const clientesActualesString = JSON.stringify(clientes);
    
    if (clientesString !== clientesActualesString) {
      setClientes(clientesIniciales);
    }
  }, [clientesIniciales, clientes]);

  // Manejador para reordenar la ruta
  const handleReorderRoute = useCallback((clientesOrdenados: ClienteConRuta[]) => {
    const clientesOrdenadosString = JSON.stringify(clientesOrdenados);
    const clientesActualesString = JSON.stringify(clientes);
    
    if (clientesOrdenadosString !== clientesActualesString) {
      setClientes(clientesOrdenados);
    }
  }, [clientes]);

  // Efecto para cargar la biblioteca de marcadores
  useEffect(() => {
    if (!isLoaded) return;

    const loadMarkerLibrary = async () => {
      try {
        await google.maps.importLibrary("marker");
        setMarkerLibLoaded(true);
      } catch (error) {
        console.error('Error al cargar la biblioteca de marcadores:', error);
        setError('Error al cargar los marcadores. Por favor, recarga la página.');
      }
    };

    loadMarkerLibrary();
  }, [isLoaded]);

  // Efecto para inicializar el mapa y los marcadores
  useEffect(() => {
    if (!isLoaded || !markerLibLoaded || !mapContainerRef.current) return;

    try {
      const map = new google.maps.Map(mapContainerRef.current, {
        center: { lat: 19.4326, lng: -99.1332 },
        zoom: 12,
        mapId: 'YOUR_MAP_ID',
        disableDefaultUI: false,
        clickableIcons: false,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false
      });

      mapRef.current = map;

      // Crear marcadores para los clientes
      const bounds = new google.maps.LatLngBounds();
      let hasValidLocations = false;

      // Agregar ubicación actual si está disponible
      if (ubicacionActual) {
        const currentLocation = createLatLng({
          lat: ubicacionActual.latitude,
          lng: ubicacionActual.longitude
        });
        if (currentLocation) {
          bounds.extend(currentLocation);
          hasValidLocations = true;

          // Crear marcador de ubicación actual
          const currentLocationDiv = document.createElement('div');
          currentLocationDiv.style.cssText = `
            width: 24px;
            height: 24px;
            background-color: #4F46E5;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          `;

          new google.maps.marker.AdvancedMarkerElement({
            map,
            position: currentLocation,
            title: 'Tu ubicación actual',
            content: currentLocationDiv
          });
        }
      }

      // Crear marcadores para cada cliente
      clientes.forEach((cliente, index) => {
        if (!cliente.coords) return;

        const position = createLatLng(cliente.coords);
        if (!position) return;

        bounds.extend(position);
        hasValidLocations = true;

        // Crear el marcador
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position,
          title: cliente.nombre,
          content: createMarkerContent(cliente, index)
        });

        marker.addListener('click', () => {
          if (onClienteClick) {
            onClienteClick(cliente);
          }
        });
      });

      // Ajustar el mapa para mostrar todos los marcadores
      if (hasValidLocations) {
        map.fitBounds(bounds);
        const zoom = map.getZoom();
        if (zoom !== undefined && zoom > 15) {
          map.setZoom(15);
        }
      }

    } catch (error) {
      console.error('Error al inicializar el mapa:', error);
      setError('Error al inicializar el mapa. Por favor, recarga la página.');
    }
  }, [isLoaded, markerLibLoaded, clientes, ubicacionActual, onClienteClick, createLatLng, isValidLatLng, createMarkerContent]);

  // Manejadores para la ruta
  const handleStartRoute = useCallback(() => {
    // Centrar el mapa en la ubicación actual si está disponible
    if (ubicacionActual && mapRef.current) {
      const currentLocation = createLatLng({
        lat: ubicacionActual.latitude,
        lng: ubicacionActual.longitude
      });
      if (currentLocation) {
        mapRef.current.panTo(currentLocation);
      }
    }
  }, [ubicacionActual, createLatLng]);

  const handleEndRoute = useCallback(() => {
    // Ajustar el mapa para mostrar todos los marcadores
    if (mapRef.current) {
      const bounds = new google.maps.LatLngBounds();
      let hasValidLocations = false;

      // Agregar ubicación actual si está disponible
      if (ubicacionActual) {
        const currentLocation = createLatLng({
          lat: ubicacionActual.latitude,
          lng: ubicacionActual.longitude
        });
        if (currentLocation) {
          bounds.extend(currentLocation);
          hasValidLocations = true;
        }
      }

      // Agregar ubicaciones de clientes
      clientes.forEach(cliente => {
        if (cliente.coords) {
          const position = createLatLng(cliente.coords);
          if (position) {
            bounds.extend(position);
            hasValidLocations = true;
          }
        }
      });

      if (hasValidLocations) {
        mapRef.current.fitBounds(bounds);
        const zoom = mapRef.current.getZoom();
        if (zoom !== undefined && zoom > 15) {
          mapRef.current.setZoom(15);
        }
      }
    }
  }, [clientes, ubicacionActual, createLatLng]);

  if (loadError) {
    return <div className="text-red-500">Error al cargar el mapa: {loadError.message}</div>;
  }

  if (!isLoaded || !markerLibLoaded) {
    return <div className="flex justify-center items-center h-full">
      <LoadingSpinner className="w-8 h-8" />
    </div>;
  }

  return (
    <div className="space-y-4">
      <div className={`relative ${className}`}>
        <div 
          ref={mapContainerRef}
          className="w-full h-full min-h-[400px] rounded-lg overflow-hidden"
        />
        {error && (
          <div className="absolute bottom-4 left-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
      </div>

      <IniciarRuta
        clientes={clientes}
        onStartRoute={handleStartRoute}
        onEndRoute={handleEndRoute}
        onUpdateCliente={onUpdateCliente}
        onReorderRoute={handleReorderRoute}
        ubicacionActual={ubicacionActual ? {
          lat: ubicacionActual.latitude,
          lng: ubicacionActual.longitude
        } : undefined}
        className="mt-4"
      />
    </div>
  );
};