import React from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_OPTIONS } from './googleMapsConfig';
import { GoogleMapsContext } from './contexts/googleMapsContext';

interface Props {
  children: React.ReactNode;
}

export const GoogleMapsProvider: React.FC<Props> = ({ children }) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
    ...GOOGLE_MAPS_OPTIONS
  });

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}; 