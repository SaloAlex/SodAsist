import { AreaServicio } from '../types';

const ABREVIATURAS: Record<string, string> = {
  'av.': 'avenida',
  'avda.': 'avenida',
  'c.': 'calle',
  'sta.': 'santa',
  'sto.': 'santo',
  'gral.': 'general',
  'cnel.': 'coronel',
  'dr.': 'doctor',
  'dra.': 'doctora',
  'ing.': 'ingeniero',
  'prof.': 'profesor',
  'profa.': 'profesora',
  'esq.': 'esquina',
};

const AREAS_SERVICIO: Record<string, AreaServicio> = {
  'Argentina': {
    pais: 'AR',
    bounds: {
      north: -34.2,
      south: -35.1,
      east: -57.8,
      west: -59.1,
    }
  },
  'México': {
    pais: 'MX',
    bounds: {
      north: 19.6,
      south: 19.1,
      east: -98.9,
      west: -99.4,
    }
  }
};

export const normalizarDireccion = (direccion: string): string => {
  let normalizada = direccion.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/\s+/g, ' ')            // Normalizar espacios
    .trim();

  // Expandir abreviaturas comunes
  Object.entries(ABREVIATURAS).forEach(([abrev, completa]) => {
    const regex = new RegExp(`\\b${abrev}\\b`, 'g');
    normalizada = normalizada.replace(regex, completa);
  });

  return normalizada;
};

export const validarCoordenadas = (
  lat: number, 
  lng: number, 
  pais: string
): boolean => {
  const area = AREAS_SERVICIO[pais];
  if (!area) return false;

  return (
    lat >= area.bounds.south &&
    lat <= area.bounds.north &&
    lng >= area.bounds.west &&
    lng <= area.bounds.east
  );
};

export const obtenerUrlMapa = (placeId: string): string => {
  return `https://maps.google.com/?q=place_id:${placeId}`;
};

export const FIELDS_PLACES = [
  'place_id',
  'formatted_address',
  'geometry',
  'address_components',
  'types',
  'partial_match'
] as const;

export const MAX_REINTENTOS = 3;
export const DELAY_BASE = 1000; // 1 segundo

export const esperarConBackoff = async (intento: number): Promise<void> => {
  const delay = Math.min(DELAY_BASE * Math.pow(2, intento), 10000);
  await new Promise(resolve => setTimeout(resolve, delay));
}; 