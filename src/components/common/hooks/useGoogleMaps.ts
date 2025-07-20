import { useContext } from 'react';
import { GoogleMapsContext } from '../contexts/googleMapsContext';

export const useGoogleMaps = () => {
  const ctx = useContext(GoogleMapsContext);
  if (!ctx) {
    throw new Error('useGoogleMaps debe usarse dentro de GoogleMapsProvider');
  }
  return ctx;
}; 