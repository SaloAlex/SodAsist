import React, { useEffect, useRef, useState } from 'react';
import { useGoogleMaps } from '../common/GoogleMapsProvider';
import { useGeolocation } from '../../hooks/useGeolocation';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ClienteConRuta } from '../../types';

interface MapaRutaProps {
  clientes: ClienteConRuta[];
  className?: string;
  onClienteClick?: (cliente: ClienteConRuta) => void;
}

interface GeolocationCoordinatesLike {
  latitude: number;
  longitude: number;
}

export const MapaRuta: React.FC<MapaRutaProps> = ({
  clientes,
  className = '',
  onClienteClick
}) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const geolocation = useGeolocation();
  const ubicacionActual = geolocation.coords as GeolocationCoordinatesLike | null;
  const { isLoaded, loadError } = useGoogleMaps();
  const [markerLibLoaded, setMarkerLibLoaded] = useState(false);

  // Función para validar coordenadas
  const isValidLatLng = (coords: { lat: number; lng: number }): boolean => {
    const lat = Number(coords.lat);
    const lng = Number(coords.lng);
    
    if (isNaN(lat) || isNaN(lng)) {
      console.warn('Coordenadas no son números válidos:', coords);
      return false;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.warn('Coordenadas fuera de rango:', coords);
      return false;
    }

    return true;
  };

  // Función para crear un LatLng válido
  const createLatLng = (coords: { lat: number; lng: number }): google.maps.LatLng | null => {
    try {
      if (!isValidLatLng(coords)) return null;
      return new google.maps.LatLng(coords.lat, coords.lng);
    } catch (error) {
      console.error('Error al crear LatLng:', error);
      return null;
    }
  };

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

  // Efecto para inicializar el mapa
  useEffect(() => {
    if (!isLoaded || !markerLibLoaded || !mapContainerRef.current) return;

    try {
      // Obtener la ubicación inicial del mapa
      let initialCenter = { lat: 19.4326, lng: -99.1332 }; // CDMX por defecto
      const bounds = new google.maps.LatLngBounds();
      let hasValidLocations = false;

      // Si hay ubicación actual, usarla como centro inicial
      if (ubicacionActual) {
        const currentLocation = {
          lat: ubicacionActual.latitude,
          lng: ubicacionActual.longitude
        };
        if (isValidLatLng(currentLocation)) {
          initialCenter = currentLocation;
          bounds.extend(new google.maps.LatLng(currentLocation));
          hasValidLocations = true;
        }
      }

      // Crear el mapa
      const map = new google.maps.Map(mapContainerRef.current, {
        center: initialCenter,
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
      clientes.forEach((cliente, index) => {
        if (!cliente.coords) {
          console.warn('Cliente sin coordenadas:', cliente);
          return;
        }

        // Validar y crear LatLng
        const position = createLatLng(cliente.coords);
        if (!position) {
          console.warn('Coordenadas inválidas para cliente:', cliente);
          return;
        }

        // Extender los bounds
        bounds.extend(position);
        hasValidLocations = true;

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

        // Crear el marcador usando la biblioteca importada
        const { AdvancedMarkerElement } = google.maps.marker;
        const marker = new AdvancedMarkerElement({
          map,
          position,
          title: cliente.nombre,
          content: container
        });

        // Agregar evento de clic
        marker.addListener('click', () => {
          if (onClienteClick) {
            onClienteClick(cliente);
          }
        });
      });

      // Agregar marcador de ubicación actual si está disponible
      if (ubicacionActual) {
        const currentLocation = {
          lat: ubicacionActual.latitude,
          lng: ubicacionActual.longitude
        };

        const position = createLatLng(currentLocation);
        if (position) {
          const currentLocationDiv = document.createElement('div');
          currentLocationDiv.style.cssText = `
            width: 24px;
            height: 24px;
            background-color: #4F46E5;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          `;

          const { AdvancedMarkerElement } = google.maps.marker;
          new AdvancedMarkerElement({
            map,
            position,
            title: 'Tu ubicación actual',
            content: currentLocationDiv
          });
        }
      }

      // Ajustar el mapa a los marcadores si hay ubicaciones válidas
      if (hasValidLocations) {
        map.fitBounds(bounds);
        // Si solo hay un punto, hacer zoom apropiado
        const zoom = map.getZoom();
        if (zoom !== undefined && zoom > 15) {
          map.setZoom(15);
        }
      }

    } catch (error) {
      console.error('Error al inicializar el mapa:', error);
      setError('Error al inicializar el mapa. Por favor, recarga la página.');
    }
  }, [isLoaded, markerLibLoaded, clientes, ubicacionActual, onClienteClick]);

  if (loadError) {
    return <div className="text-red-500">Error al cargar el mapa: {loadError.message}</div>;
  }

  if (!isLoaded || !markerLibLoaded) {
    return <div className="flex justify-center items-center h-full">
      <LoadingSpinner className="w-8 h-8" />
    </div>;
  }

  return (
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
  );
};