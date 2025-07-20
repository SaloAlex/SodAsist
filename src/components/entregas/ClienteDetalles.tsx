import React, { useState } from 'react';
import { ClienteConRuta, EstadoVisita } from '../../types';
import { FaCheck, FaTimes, FaHistory, FaEdit, FaMapMarkerAlt, FaUndo } from 'react-icons/fa';
import { NotasForm } from './NotasForm';

interface ClienteDetallesProps {
  cliente: ClienteConRuta;
  visitaCompletada: boolean;
  orden: number;
  onMarcarVisita: (estado: EstadoVisita) => void;
  onVerHistorial: () => void;
  onAgregarNota: (nota: string) => void;
}

export const ClienteDetalles: React.FC<ClienteDetallesProps> = ({
  cliente,
  visitaCompletada,
  orden,
  onMarcarVisita,
  onVerHistorial,
  onAgregarNota,
}) => {
  const [mostrarNotas, setMostrarNotas] = useState(false);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4 mb-4 relative ${
      visitaCompletada ? 'border-l-4 border-green-500' : ''
    }`}>
      {/* Número de orden */}
      <div className="absolute -left-2 sm:-left-4 -top-2 sm:-top-4 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold shadow-lg text-xs sm:text-sm">
        {orden}
      </div>

      <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:justify-between sm:items-start">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg sm:text-xl font-bold mb-2 dark:text-white pr-8 sm:pr-0">{cliente.nombre}</h3>
          <div className="space-y-1 text-sm sm:text-base text-gray-600 dark:text-gray-300">
            <p className="flex items-start">
              <FaMapMarkerAlt className="mr-2 mt-1 flex-shrink-0" />
              <span className="break-words">{cliente.direccion}</span>
            </p>
            <p className="flex items-center">
              <span className="mr-2">📞</span>
              <span className="break-all">{cliente.telefono}</span>
            </p>
            <p className="flex items-center">
              <span className="mr-2">📍</span>
              <span>{cliente.zona}</span>
            </p>
            {cliente.observaciones && (
              <p className="text-xs sm:text-sm italic bg-gray-50 dark:bg-gray-700 p-2 rounded">
                <span className="font-medium">Notas:</span> {cliente.observaciones}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col space-y-2 sm:ml-4 w-full sm:w-auto">
          {!visitaCompletada ? (
            <div className="grid grid-cols-2 sm:flex sm:flex-col gap-2">
              <button
                onClick={() => onMarcarVisita(EstadoVisita.COMPLETADA)}
                className="flex items-center justify-center px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm font-medium transition-colors"
              >
                <FaCheck className="mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Completar</span>
                <span className="xs:hidden">✓</span>
              </button>
              <button
                onClick={() => onMarcarVisita(EstadoVisita.CANCELADA)}
                className="flex items-center justify-center px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium transition-colors"
              >
                <FaTimes className="mr-1 sm:mr-2" />
                <span className="hidden xs:inline">No encontrado</span>
                <span className="xs:hidden">✗</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-center text-green-500 font-semibold text-sm sm:text-base">
                <FaCheck className="mr-2" />
                Completado
              </div>
              <button
                onClick={() => onMarcarVisita(EstadoVisita.PENDIENTE)}
                className="flex items-center justify-center px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm font-medium transition-colors w-full"
                title="Deshacer visita completada"
              >
                <FaUndo className="mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Deshacer</span>
                <span className="xs:hidden">↶</span>
              </button>
            </div>
          )}
          
          <div className="grid grid-cols-2 sm:flex sm:flex-col gap-2">
            <button
              onClick={onVerHistorial}
              className="flex items-center justify-center px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium transition-colors"
            >
              <FaHistory className="mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Historial</span>
              <span className="xs:hidden">📋</span>
            </button>
            
            <button
              onClick={() => setMostrarNotas(true)}
              className="flex items-center justify-center px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm font-medium transition-colors"
            >
              <FaEdit className="mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Nota</span>
              <span className="xs:hidden">✏️</span>
            </button>
          </div>
        </div>
      </div>

      {mostrarNotas && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <NotasForm
            onSubmit={(nota) => {
              onAgregarNota(nota);
              setMostrarNotas(false);
            }}
          />
        </div>
      )}
    </div>
  );
}; 