import React from 'react';
import { Clock, MapPin, Navigation, CheckCircle, Info } from 'lucide-react';
import { ClienteConRuta } from '../../types';

interface InfoRutaProps {
  estadisticas: {
    distanciaTotal: string;
    tiempoTotal: string;
  } | null;
  clientes: ClienteConRuta[];
  progresoRuta: {
    completados: number;
    total: number;
    porcentaje: number;
  };
  className?: string;
}

export const InfoRuta: React.FC<InfoRutaProps> = ({
  estadisticas,
  clientes,
  progresoRuta,
  className = ''
}) => {
  if (!estadisticas) return null;

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Panel de Estadísticas */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold mb-3 flex items-center text-gray-800">
          <Info className="w-5 h-5 mr-2 text-blue-600" />
          Información de la ruta
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-gray-600">
                <Navigation className="w-4 h-4 mr-2" />
                <span>Distancia total:</span>
              </div>
              <span className="font-medium text-gray-900">{estadisticas.distanciaTotal}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center text-gray-600">
                <Clock className="w-4 h-4 mr-2" />
                <span>Tiempo estimado:</span>
              </div>
              <span className="font-medium text-gray-900">{estadisticas.tiempoTotal}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-gray-600">
                <MapPin className="w-4 h-4 mr-2" />
                <span>Paradas:</span>
              </div>
              <span className="font-medium text-gray-900">{clientes.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center text-gray-600">
                <CheckCircle className="w-4 h-4 mr-2" />
                <span>Completadas:</span>
              </div>
              <span className="font-medium text-gray-900">{progresoRuta.completados}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Progreso */}
      <div className="p-4 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progreso de la ruta
          </span>
          <span className="text-sm font-medium text-blue-600">
            {progresoRuta.completados} de {progresoRuta.total}
          </span>
        </div>
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${progresoRuta.porcentaje}%` }}
          />
        </div>
      </div>
    </div>
  );
}; 