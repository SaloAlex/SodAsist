import { useState, useEffect } from 'react';

interface GeolocationState {
  coords: {
    lat: number;
    lng: number;
  } | null;
  error: string | null;
  loading: boolean;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    error: null,
    loading: true
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'La geolocalización no está soportada en este navegador',
        loading: false
      }));
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      setState({
        coords: {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        },
        error: null,
        loading: false
      });
    };

    const handleError = (error: GeolocationPositionError) => {
      let mensaje = 'Error al obtener la ubicación';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          mensaje = 'No se otorgó permiso para acceder a la ubicación';
          break;
        case error.POSITION_UNAVAILABLE:
          mensaje = 'La información de ubicación no está disponible';
          break;
        case error.TIMEOUT:
          mensaje = 'Se agotó el tiempo de espera para obtener la ubicación';
          break;
      }
      setState({
        coords: null,
        error: mensaje,
        loading: false
      });
    };

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };

    // Obtener ubicación inicial
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);

    // Suscribirse a actualizaciones de ubicación
    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, options);

    // Limpiar al desmontar
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return state;
}; 