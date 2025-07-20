import { createContext } from 'react';

export interface GoogleMapsContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
}

export const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  loadError: undefined,
}); 