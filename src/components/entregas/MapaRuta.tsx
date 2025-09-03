import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ClienteConRuta, EstadoVisita, LatLng } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useGoogleMaps } from '../common/hooks/useGoogleMaps';
import { FaExclamationTriangle, FaRoute, FaEye, FaEyeSlash } from 'react-icons/fa';
import './MapaRuta.css';

interface MapaRutaProps {
  clientes: ClienteConRuta[];
  ubicacionActual?: LatLng | null;
  onOptimizarRuta?: () => void;
  optimizing?: boolean;
  onToggleMapa?: () => void;
  mostrarMapa?: boolean;
}

export const MapaRuta: React.FC<MapaRutaProps> = ({
  clientes,
  ubicacionActual,
  onOptimizarRuta,
  optimizing = false,
  onToggleMapa,
  mostrarMapa = true
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [clientesInternos, setClientes] = useState<ClienteConRuta[]>(clientes);
  const [error, setError] = useState<string | null>(null);
  const { isLoaded, loadError } = useGoogleMaps();
  const [markerLibLoaded, setMarkerLibLoaded] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);

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
      background-color: ${cliente.estado === EstadoVisita.COMPLETADA ? '#10B981' : '#3B82F6'};
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

  // Función para actualizar marcadores cuando cambien los clientes
  const actualizarMarcadores = useCallback(() => {
    if (!mapRef.current || !markerLibLoaded) return;

    // Limpiar marcadores existentes del mapa
    const existingMarkers = document.querySelectorAll('.marker-content');
    existingMarkers.forEach(marker => marker.remove());

    // Crear nuevos marcadores
    const markers: google.maps.marker.AdvancedMarkerElement[] = [];
    const bounds = new google.maps.LatLngBounds();
    let hasValidLocations = false;

    // Agregar ubicación actual si está disponible
    if (ubicacionActual) {
      const currentLocation = new google.maps.LatLng(ubicacionActual.lat, ubicacionActual.lng);
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

      const currentLocationMarker = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current,
        position: currentLocation,
        title: 'Tu ubicación actual',
        content: currentLocationDiv
      });
      markers.push(currentLocationMarker);
    }

    // Crear marcadores para cada cliente
    clientesInternos.forEach((cliente, index) => {
      if (!cliente.coords) {
        console.warn(`⚠️ Cliente ${cliente.nombre} (${cliente.id}) no tiene coordenadas`);
        return;
      }

      const position = new google.maps.LatLng(cliente.coords.lat, cliente.coords.lng);
      bounds.extend(position);
      hasValidLocations = true;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current!,
        position,
        title: cliente.nombre,
        content: createMarkerContent(cliente, index)
      });

      marker.addListener('click', () => {
        // if (onClienteClick) {
        //   onClienteClick(cliente);
        // }
      });

      markers.push(marker);
    });

    // Ajustar el mapa para mostrar todos los marcadores
    if (hasValidLocations) {
      mapRef.current.fitBounds(bounds);
      const zoom = mapRef.current.getZoom();
      if (zoom !== undefined && zoom > 15) {
        mapRef.current.setZoom(15);
      }
    }
  }, [clientesInternos, ubicacionActual, markerLibLoaded, createMarkerContent]);

  // Efecto para actualizar clientes cuando cambian los iniciales
  useEffect(() => {
    setClientes(clientes);
    
    // Si el mapa ya está inicializado, actualizar los marcadores
    if (mapInitialized && mapRef.current) {
      actualizarMarcadores();
    }
  }, [clientes, mapInitialized, actualizarMarcadores]);

  // Efecto para manejar resize del mapa y evitar parpadeo
  useEffect(() => {
    if (!mapRef.current) return;

    let resizeTimeout: NodeJS.Timeout;
    
    const handleResize = () => {
      // Debounce el resize para evitar múltiples llamadas
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (mapRef.current) {
          google.maps.event.trigger(mapRef.current, 'resize');
        }
      }, 100);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // Función para validar coordenadas
  const isValidLatLng = useCallback((coords: LatLng | null | undefined): boolean => {
    if (!coords) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Coordenadas son null o undefined');
      }
      return false;
    }

    if (typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Coordenadas no son números válidos:', coords);
      }
      return false;
    }

    if (coords.lat < -90 || coords.lat > 90 || coords.lng < -180 || coords.lng > 180) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Coordenadas fuera de rango:', coords);
      }
      return false;
    }

    return true;
  }, []);

  // Función para convertir coordenadas a formato LatLng
  const coordsToLatLng = useCallback((coords: LatLng): LatLng => {
    return coords;
  }, []);

  // Función para crear un LatLng válido
  const createLatLng = useCallback((coords: LatLng | null | undefined): google.maps.LatLng | null => {
    try {
      if (!isValidLatLng(coords) || !coords) return null;

      const latLng = coordsToLatLng(coords);
      return new google.maps.LatLng(latLng.lat, latLng.lng);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error al crear LatLng:', error);
      }
      return null;
    }
  }, [isValidLatLng, coordsToLatLng]);





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
    if (!isLoaded || !markerLibLoaded || !mapContainerRef.current || mapInitialized) {
      return;
    }

    let mounted = true;
    const markers: google.maps.marker.AdvancedMarkerElement[] = [];

    const initializeMap = async () => {
      try {
        const map = new google.maps.Map(mapContainerRef.current!, {
          center: { lat: 19.4326, lng: -99.1332 },
          zoom: 12,
          mapId: 'YOUR_MAP_ID',
          disableDefaultUI: false,
          clickableIcons: false,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          gestureHandling: 'cooperative',
          isFractionalZoomEnabled: true,
          // Configuraciones adicionales para mejorar rendimiento
          keyboardShortcuts: false,
          scrollwheel: true,
          draggable: true,
          zoomControl: true,
          scaleControl: false,
          // Optimizaciones para móviles
          tilt: 0,
          heading: 0,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          // Configuración para event listeners pasivos (evita warnings de rendimiento)
          disableDoubleClickZoom: false,
          draggableCursor: 'grab',
          draggingCursor: 'grabbing',
          // Reducir la calidad en móviles para mejor rendimiento
          ...(window.innerWidth < 768 && {
            zoomControlOptions: {
              position: google.maps.ControlPosition.RIGHT_BOTTOM,
            },
            // Deshabilitar algunas características en móviles
            rotateControl: false,
            tiltControl: false,
          }),
        });

        mapRef.current = map;

        // Configurar opciones de gestos táctiles para evitar warnings de rendimiento
        const mapDiv = mapContainerRef.current;
        if (mapDiv) {
          // Aplicar estilos CSS para mejorar rendimiento táctil y evitar parpadeo
          mapDiv.style.touchAction = 'pan-x pan-y zoom-in zoom-out';
          mapDiv.style.overscrollBehavior = 'contain';
          mapDiv.style.willChange = 'transform';
          mapDiv.style.transform = 'translateZ(0)';
          // @ts-expect-error - webkit prefix no está en tipos estándar
          mapDiv.style.webkitOverflowScrolling = 'touch';
          mapDiv.style.webkitTransform = 'translateZ(0)';
          // Prevenir parpadeo en iOS
          mapDiv.style.webkitBackfaceVisibility = 'hidden';
          mapDiv.style.backfaceVisibility = 'hidden';

          // Configuraciones adicionales para event listeners pasivos
          mapDiv.style.touchAction = 'manipulation';
          mapDiv.style.userSelect = 'none';

          // Aplicar prefijos de navegador usando propiedades extendidas
          const style = mapDiv.style as CSSStyleDeclaration & {
            webkitUserSelect?: string;
            msUserSelect?: string;
          };
          style.webkitUserSelect = 'none';
          style.msUserSelect = 'none';

          // Optimizar para dispositivos móviles
          if ('ontouchstart' in window) {
            mapDiv.style.touchAction = 'pan-x pan-y pinch-zoom';
          }
        }

        // Crear marcadores para los clientes
        const bounds = new google.maps.LatLngBounds();
        let hasValidLocations = false;

        // Agregar ubicación actual si está disponible
        if (ubicacionActual) {
          const currentLocation = new google.maps.LatLng(ubicacionActual.lat, ubicacionActual.lng);
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

          const currentLocationMarker = new google.maps.marker.AdvancedMarkerElement({
            map,
            position: currentLocation,
            title: 'Tu ubicación actual',
            content: currentLocationDiv
          });
          markers.push(currentLocationMarker);
        }

        // Debug: Verificar clientes y coordenadas


        // Crear marcadores para cada cliente
        clientesInternos.forEach((cliente, index) => {
          if (!cliente.coords) {
            console.warn(`⚠️ Cliente ${cliente.nombre} (${cliente.id}) no tiene coordenadas`);
            return;
          }

          const position = new google.maps.LatLng(cliente.coords.lat, cliente.coords.lng);
          bounds.extend(position);
          hasValidLocations = true;

  

          const marker = new google.maps.marker.AdvancedMarkerElement({
            map,
            position,
            title: cliente.nombre,
            content: createMarkerContent(cliente, index)
          });

          marker.addListener('click', () => {
            // if (onClienteClick) {
            //   onClienteClick(cliente);
            // }
          });

          markers.push(marker);
        });

        // Ajustar el mapa para mostrar todos los marcadores
        if (hasValidLocations) {
          map.fitBounds(bounds);
          const zoom = map.getZoom();
          if (zoom !== undefined && zoom > 15) {
            map.setZoom(15);
          }
        }

        // Marcar como inicializado para evitar re-inicializaciones
        if (mounted) {
  
          setMapInitialized(true);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error al inicializar el mapa:', error);
        }
        if (mounted) {
          setError('Error al inicializar el mapa. Por favor, recarga la página.');
        }
      }
    };

    initializeMap();

    return () => {
      mounted = false;
      markers.forEach(marker => {
        if (marker) {
          marker.map = null;
        }
      });
    };
  }, [isLoaded, markerLibLoaded, clientesInternos, ubicacionActual, createMarkerContent, mapInitialized]);

  const centrarMapa = useCallback(() => {
    if (mapRef.current) {
      const bounds = new google.maps.LatLngBounds();
      let hasValidLocations = false;

      // Agregar ubicación actual si está disponible
      if (ubicacionActual) {
        const currentLocation = createLatLng({
          lat: ubicacionActual.lat,
          lng: ubicacionActual.lng
        });
        if (currentLocation) {
          bounds.extend(currentLocation);
          hasValidLocations = true;
        }
      }

      // Agregar ubicaciones de clientes
      clientesInternos.forEach(cliente => {
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
  }, [clientesInternos, ubicacionActual, createLatLng]);

  if (loadError) {
    return (
      <div className="text-red-500 p-4 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-center mb-2">
          <FaExclamationTriangle className="text-xl mr-2" />
          <span className="font-semibold">Error al cargar el mapa</span>
        </div>
        <p>{loadError.message}</p>
      </div>
    );
  }

  if (!isLoaded || !markerLibLoaded) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[400px] bg-gray-50 dark:bg-gray-800 rounded-lg">
        <LoadingSpinner className="w-8 h-8 mb-4" />
        <p className="text-gray-600 dark:text-gray-300">Cargando mapa...</p>
      </div>
    );
  }

  // Debug: Log del render


  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              Mapa de Ruta
              {ubicacionActual && (
                <span className="text-xs sm:text-sm text-green-600 dark:text-green-400 ml-2">
                  📍 Ubicación activa
                </span>
              )}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {onOptimizarRuta && (
              <button
                onClick={onOptimizarRuta}
                disabled={optimizing || clientes.length === 0}
                className="px-2 sm:px-3 py-2 sm:py-1 bg-blue-500 text-white text-xs sm:text-sm rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              >
                {optimizing ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    <span className="hidden sm:inline">Optimizando...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <FaRoute className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Optimizar</span>
                    <span className="sm:hidden">Opt</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={centrarMapa}
              className="px-2 sm:px-3 py-2 sm:py-1 bg-gray-500 text-white text-xs sm:text-sm rounded hover:bg-gray-600 flex items-center gap-1 transition-colors"
            >
              <span className="hidden sm:inline">Centrar</span>
              <span className="sm:hidden">📍</span>
            </button>
            
            {onToggleMapa && (
              <button
                onClick={onToggleMapa}
                className="px-2 sm:px-3 py-2 sm:py-1 bg-indigo-500 text-white text-xs sm:text-sm rounded hover:bg-indigo-600 flex items-center gap-1 transition-colors"
              >
                {mostrarMapa ? (
                  <>
                    <FaEyeSlash className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Ocultar</span>
                    <span className="sm:hidden">👁️</span>
                  </>
                ) : (
                  <>
                    <FaEye className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Mostrar</span>
                    <span className="sm:hidden">👁️</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div 
        ref={mapContainerRef}
        className="w-full h-64 sm:h-80 md:h-96 map-container"
        style={{
          position: 'relative',
          zIndex: 1
        }}
      />
      
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};