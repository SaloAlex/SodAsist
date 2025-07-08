import React from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { LoadingSpinner } from './LoadingSpinner';

// Definir las libraries como constante fuera del componente
const libraries: ("places" | "geometry" | "marker")[] = ["places", "geometry", "marker"];

interface GoogleMapsProviderProps {
  children: React.ReactNode;
}

// Definir el componente usando function declaration para mayor claridad
export function GoogleMapsProvider({ children }: GoogleMapsProviderProps): JSX.Element {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries,
  });

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        Error al cargar Google Maps: {loadError.message}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
        <p className="ml-2">Cargando Google Maps...</p>
      </div>
    );
  }

  return <>{children}</>;
}

// Asegurarnos de que el displayName esté definido
GoogleMapsProvider.displayName = 'GoogleMapsProvider'; 