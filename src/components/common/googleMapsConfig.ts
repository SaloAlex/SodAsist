import { Libraries } from '@react-google-maps/api';

export const GOOGLE_MAPS_LIBRARIES: Libraries = ['places', 'routes'];

export const GOOGLE_MAPS_OPTIONS = {
  id: 'google-maps-script',
  version: 'weekly',
  language: 'es',
  region: 'MX',
} as const; 