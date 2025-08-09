import React from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_OPTIONS } from './googleMapsConfig';
import { GoogleMapsContext } from './contexts/googleMapsContext';
import { GoogleMapsErrorBoundary } from './GoogleMapsErrorBoundary';

interface Props {
  children: React.ReactNode;
}

export const GoogleMapsProvider: React.FC<Props> = ({ children }) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
    ...GOOGLE_MAPS_OPTIONS
  });

  // Si hay error de carga, mostrar componente de error
  if (loadError) {
    console.error('Google Maps Load Error:', loadError);
    return (
      <GoogleMapsContext.Provider value={{ isLoaded: false, loadError }}>
        <GoogleMapsErrorBoundary>
          {children}
        </GoogleMapsErrorBoundary>
      </GoogleMapsContext.Provider>
    );
  }

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      <GoogleMapsErrorBoundary>
        {children}
      </GoogleMapsErrorBoundary>
    </GoogleMapsContext.Provider>
  );
}; 