import React from 'react';
import { ClienteConRuta, EstadoVisita } from '../../types';
import { FaHistory } from 'react-icons/fa';
import { MdDone, MdCancel } from 'react-icons/md';
import { NotasForm } from './NotasForm';

interface ClienteDetallesProps {
  cliente: ClienteConRuta;
  visitaCompletada: boolean;
  onMarcarVisita: (estado: EstadoVisita) => void;
  onVerHistorial: () => void;
  onAgregarNota: (nota: string) => void;
}

export const ClienteDetalles: React.FC<ClienteDetallesProps> = ({
  cliente,
  visitaCompletada,
  onMarcarVisita,
  onVerHistorial,
  onAgregarNota,
}) => {
  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold">{cliente.nombre}</h3>
          <p className="text-gray-600">{cliente.direccion}</p>
          <p className="text-gray-500">{cliente.telefono}</p>
          {cliente.observaciones && (
            <p className="text-gray-500 mt-2">
              Notas: {cliente.observaciones}
            </p>
          )}
          {cliente.saldoPendiente && cliente.saldoPendiente > 0 && (
            <p className="text-red-500 mt-2">
              Saldo pendiente: ${cliente.saldoPendiente.toFixed(2)}
            </p>
          )}
          {cliente.productosFrecuentes && cliente.productosFrecuentes.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-semibold">Productos frecuentes:</p>
              <ul className="list-disc list-inside text-sm text-gray-600">
                {cliente.productosFrecuentes.map((producto, index) => (
                  <li key={index}>
                    {producto.producto}: {producto.cantidadPromedio} unidades (frecuencia: {producto.frecuencia}%)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onVerHistorial}
            className="p-2 text-blue-500 hover:bg-blue-100 rounded"
            title="Ver historial"
          >
            <FaHistory />
          </button>
          <button
            onClick={() => onMarcarVisita(EstadoVisita.COMPLETADA)}
            className="p-2 text-green-500 hover:bg-green-100 rounded"
            disabled={visitaCompletada}
            title="Marcar como completada"
          >
            <MdDone />
          </button>
          <button
            onClick={() => onMarcarVisita(EstadoVisita.CANCELADA)}
            className="p-2 text-red-500 hover:bg-red-100 rounded"
            title="Marcar como cancelada"
          >
            <MdCancel />
          </button>
        </div>
      </div>

      {visitaCompletada && (
        <div className="mt-4">
          <NotasForm
            onSubmit={onAgregarNota}
            className="mt-2"
          />
        </div>
      )}
    </div>
  );
}; 