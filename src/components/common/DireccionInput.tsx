import React, { useEffect, useRef, useState, useCallback } from 'react';
import { DireccionDetalles, DireccionValidacion } from '../../types';
import { LoadingSpinner } from './LoadingSpinner';
import { normalizarDireccion, validarCoordenadas } from '../../utils/direccionUtils';
import { useGoogleMaps } from './hooks/useGoogleMaps';

type PaisValido = 'México' | 'Argentina';

const PLACE_FIELDS: string[] = [
  'address_components',
  'formatted_address',
  'geometry',
  'place_id'
];

const MAX_REINTENTOS = 3;

const esperarConBackoff = (intento: number): Promise<void> => {
  const tiempoEspera = Math.min(1000 * Math.pow(2, intento), 10000);
  return new Promise(resolve => setTimeout(resolve, tiempoEspera));
};

interface DireccionInputProps {
  value: string;
  onChange: (detalles: DireccionDetalles) => void;
  onValidation?: (validacion: DireccionValidacion) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  onError?: (mensaje: string) => void;
}

interface PlacePredictionSelectEvent extends Event {
  placePrediction: {
    toPlace: () => google.maps.places.Place;
  };
}

export const DireccionInput: React.FC<DireccionInputProps> = ({
  value,
  onChange,
  onValidation,
  onError,
  className = '',
  placeholder = 'Dirección completa',
  required = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const [inputValue, setInputValue] = useState(value);
  const [hasSelectedPlace, setHasSelectedPlace] = useState(!!value);
  const [loading, setLoading] = useState(false);
  const { isLoaded, loadError } = useGoogleMaps();

  // Actualizar el valor del input cuando cambia el valor de la prop
  useEffect(() => {
    setInputValue(value);
    if (value) {
      setHasSelectedPlace(true);
      onValidation?.({ isValid: true });
    }
  }, [value, onValidation]);

  // Mostrar el valor inicial en el input cuando se carga
  useEffect(() => {
    if (value && !inputValue) {
      setInputValue(value);
      setHasSelectedPlace(true);
    }
  }, [value, inputValue]);

  const obtenerDetallesLugar = useCallback(async (placeId: string, intentos = 0): Promise<google.maps.places.PlaceResult> => {
    if (!placesServiceRef.current) {
      throw new Error('Places service no inicializado');
    }

    try {
      const result = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
        placesServiceRef.current?.getDetails(
          {
            placeId: placeId,
            fields: PLACE_FIELDS
          },
          (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && place) {
              resolve(place);
            } else {
              reject(new Error(`Error al obtener detalles: ${status}`));
            }
          }
        );
      });
      return result;
    } catch (error) {
      if (intentos < MAX_REINTENTOS && (error instanceof Error && 
          (error.message.includes('OVER_QUERY_LIMIT') || 
           error.message.includes('UNKNOWN_ERROR')))) {
        await esperarConBackoff(intentos);
        return obtenerDetallesLugar(placeId, intentos + 1);
      }
      throw error;
    }
  }, []);

  const detectarPais = (addressComponents: google.maps.places.AddressComponent[]): PaisValido | null => {
    const paisComponent = addressComponents.find(c => c.types.includes('country'));
    if (!paisComponent) return null;

    if (paisComponent.shortText === 'MX') return 'México';
    if (paisComponent.shortText === 'AR') return 'Argentina';
    return null;
  };

  useEffect(() => {
    if (!isLoaded || !containerRef.current) return;

    // Capturar el valor actual del contenedor
    const currentContainer = containerRef.current;

    // Inicializar PlacesService para obtener detalles
    if (!placesServiceRef.current) {
      const mapDiv = document.createElement('div');
      const map = new google.maps.Map(mapDiv);
      placesServiceRef.current = new google.maps.places.PlacesService(map);
    }

    // Configurar el PlaceAutocompleteElement
    const autocompleteElement = new google.maps.places.PlaceAutocompleteElement({
      types: ['address'],
      componentRestrictions: { country: ['mx', 'ar'] }
    });

    // Limpiar el contenedor antes de agregar el nuevo elemento
    currentContainer.innerHTML = '';
    currentContainer.appendChild(autocompleteElement);

    // Aplicar estilos al elemento generado por Google
    const inputElement = currentContainer.querySelector('input');
    if (inputElement) {
      inputElement.className = className;
      inputElement.placeholder = placeholder;
      inputElement.value = inputValue;
    }

    // Manejar eventos del autocomplete
    autocompleteElement.addEventListener('gmp-select', async (event: Event) => {
      const selectEvent = event as PlacePredictionSelectEvent;
      setLoading(true);
      try {
        const place = selectEvent.placePrediction.toPlace();
        await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location', 'addressComponents'] });
        
        if (!place.location || !place.addressComponents) {
          throw new Error('No se pudo obtener la ubicación o los componentes de la dirección');
        }

        const pais = detectarPais(place.addressComponents);
        if (!pais) {
          throw new Error('La dirección debe estar en México o Argentina');
        }

        const lat = place.location.lat();
        const lng = place.location.lng();

        if (!validarCoordenadas(lat, lng, pais)) {
          throw new Error(`La dirección debe estar dentro de ${pais}`);
        }

        const addressComponents = place.addressComponents;
        const direccionDetalles: DireccionDetalles = {
          placeId: place.id,
          direccionCompleta: place.formattedAddress || '',
          direccionNormalizada: normalizarDireccion(place.formattedAddress || ''),
          calle: addressComponents.find(c => c.types.includes('route'))?.longText || undefined,
          numero: addressComponents.find(c => c.types.includes('street_number'))?.longText || undefined,
          colonia: addressComponents.find(c => c.types.includes('sublocality'))?.longText || undefined,
          ciudad: addressComponents.find(c => c.types.includes('locality'))?.longText || 
                 addressComponents.find(c => c.types.includes('administrative_area_level_2'))?.longText || undefined,
          estado: addressComponents.find(c => c.types.includes('administrative_area_level_1'))?.longText || undefined,
          codigoPostal: addressComponents.find(c => c.types.includes('postal_code'))?.longText || undefined,
          pais,
          coords: { lat, lng },
          addressComponents: addressComponents.map(c => ({
            long_name: c.longText || '',
            short_name: c.shortText || '',
            types: c.types
          }))
        };

        setHasSelectedPlace(true);
        setInputValue(place.formattedAddress || '');
        onChange(direccionDetalles);
        onValidation?.({
          isValid: true
        });

      } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'Error desconocido';
        onValidation?.({
          isValid: false,
          error: mensaje
        });
        onError?.(mensaje);
      } finally {
        setLoading(false);
      }
    });

    // Manejar la validación cuando el usuario escribe
    const inputElementRef = currentContainer.querySelector('input');
    if (inputElementRef) {
      inputElementRef.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        setInputValue(target.value);
        setHasSelectedPlace(false);
      });

      inputElementRef.addEventListener('blur', () => {
        if (required && !hasSelectedPlace && inputValue.trim()) {
          const mensaje = 'Por favor selecciona una dirección de la lista de sugerencias';
          onError?.(mensaje);
          onValidation?.({
            isValid: false,
            error: mensaje
          });
        }
      });
    }

    return () => {
      if (currentContainer) {
        currentContainer.innerHTML = '';
      }
    };
  }, [isLoaded, onChange, onValidation, onError, required, hasSelectedPlace, inputValue, obtenerDetallesLugar, className, placeholder]);

  if (loadError) {
    return (
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            const newValue = e.target.value;
            setInputValue(newValue);
            setHasSelectedPlace(false);
            onValidation?.({
              isValid: false,
              error: 'Error al cargar el servicio de direcciones'
            });
          }}
          className={className}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Mostrar input visible cuando hay un valor inicial o cuando no se ha cargado Google Places */}
      {(inputValue || !isLoaded) && (
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            const newValue = e.target.value;
            setInputValue(newValue);
            setHasSelectedPlace(false);
          }}
          className={className}
          placeholder={placeholder}
          readOnly={isLoaded && !loadError} // Solo editable cuando Google Places no está disponible
        />
      )}
      
      {/* Contenedor para Google Places Autocomplete */}
      <div
        ref={containerRef}
        className="google-places-autocomplete"
        style={{ display: isLoaded && !loadError ? 'block' : 'none' }}
      />
      
      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <LoadingSpinner className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}; 