import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";

interface GeolocationState {
  coords: { lat: number; lng: number } | null;
  error: string | null;
  loading: boolean;
}

const MAX_RETRIES = 5;
const RETRY_DELAY = 1000;
const LOCATION_TIMEOUT = 30000;
const LOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: LOCATION_TIMEOUT,
  maximumAge: 0,
};

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    error: null,
    loading: true,
  });

  const watchIdRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const startRef = useRef<() => void>(() => {});

  const handleError = useCallback((err: GeolocationPositionError) => {
    if (!mountedRef.current) return;

    const codeMsg = {
      1: "No se otorgó permiso para acceder a la ubicación.",
      2: "La información de ubicación no está disponible.",
      3: "Se agotó el tiempo de espera para obtener la ubicación.",
    }[err.code] ?? "Error al obtener la ubicación";

    if (retryCountRef.current < MAX_RETRIES) {
      retryCountRef.current += 1;
      toast.loading(`Reintentando ubicación (${retryCountRef.current}/${MAX_RETRIES})...`, { duration: RETRY_DELAY });

      setTimeout(() => mountedRef.current && startRef.current(), RETRY_DELAY);
      return;
    }

    setState({ coords: null, error: codeMsg, loading: false });
    toast.error(codeMsg, { icon: "📍" });
  }, []);

  const startGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      const msg = "La geolocalización no está soportada en este navegador";
      setState({ coords: null, error: msg, loading: false });
      toast.error(msg, { icon: "🌍" });
      return;
    }

    // Verificar permisos si está disponible
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        result.onchange = () => {
          // Cambio en permisos detectado
        };
      }).catch(() => {
        // No se pudo consultar permisos
      });
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setState(prev => ({ ...prev, loading: true }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        
        setState(() => {
          const newState = { coords: { lat, lng }, error: null, loading: false };
          return newState;
        });
        
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        retryCountRef.current = 0;
      }, 
      (err) => {
        handleError(err);
      }, 
      LOCATION_OPTIONS
    );
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        
        setState(() => {
          const newState = { coords: { lat, lng }, error: null, loading: false };
          return newState;
        });
        
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        retryCountRef.current = 0;
      }, 
      (err) => {
        handleError(err);
      }, 
      LOCATION_OPTIONS
    );

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      handleError({
        code: 3,
        message: "Timeout global",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      });
    }, LOCATION_TIMEOUT + 1000);
  }, [handleError]);

  // Asignar la función actual a startRef
  startRef.current = startGeolocation;

  // Solicitar geolocalización automáticamente al montar el componente
  useEffect(() => {
    startGeolocation();
 
    return () => {
      mountedRef.current = false;
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [startGeolocation]);

  const forceUpdate = useCallback(() => {
    retryCountRef.current = 0;
    startGeolocation();
  }, [startGeolocation]);

  // Función para iniciar geolocalización manualmente
  const startLocationTracking = useCallback(() => {
    if (!state.loading && !state.coords) {
      startGeolocation();
    }
  }, [state.loading, state.coords, startGeolocation]);

  return { ...state, isTracking: watchIdRef.current !== null, forceUpdate, startLocationTracking };
}; 