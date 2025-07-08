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
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4 relative ${
      visitaCompletada ? 'border-l-4 border-green-500' : ''
    }`}>
      {/* Número de orden */}
      <div className="absolute -left-4 -top-4 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold shadow-lg">
        {orden}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-2 dark:text-white">{cliente.nombre}</h3>
          <div className="space-y-1 text-gray-600 dark:text-gray-300">
            <p className="flex items-center">
              <FaMapMarkerAlt className="mr-2" />
              {cliente.direccion}
            </p>
            <p>Teléfono: {cliente.telefono}</p>
            <p>Zona: {cliente.zona}</p>
            {cliente.observaciones && (
              <p className="text-sm italic">Notas: {cliente.observaciones}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col space-y-2 mt-4 md:mt-0 md:ml-4">
          {!visitaCompletada ? (
            <>
              <button
                onClick={() => onMarcarVisita(EstadoVisita.COMPLETADA)}
                className="flex items-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                <FaCheck className="mr-2" />
                Completar
              </button>
              <button
                onClick={() => onMarcarVisita(EstadoVisita.CANCELADA)}
                className="flex items-center px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                <FaTimes className="mr-2" />
                No encontrado
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center text-green-500 font-semibold mb-2">
                <FaCheck className="mr-2" />
                Completado
              </div>
              <button
                onClick={() => onMarcarVisita(EstadoVisita.PENDIENTE)}
                className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                title="Deshacer visita completada"
              >
                <FaUndo className="mr-2" />
                Deshacer
              </button>
            </>
          )}
          
          <button
            onClick={onVerHistorial}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <FaHistory className="mr-2" />
            Historial
          </button>
          
          <button
            onClick={() => setMostrarNotas(true)}
            className="flex items-center px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            <FaEdit className="mr-2" />
            Agregar Nota
          </button>
        </div>
      </div>

      {mostrarNotas && (
        <NotasForm
          onSubmit={(nota) => {
            onAgregarNota(nota);
            setMostrarNotas(false);
          }}
        />
      )}
    </div>
  );
}; 