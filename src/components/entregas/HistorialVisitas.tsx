import React from 'react';
import { Visita } from '../../types';

interface HistorialVisitasProps {
  visitas: Visita[];
  onClose: () => void;
}

export const HistorialVisitas: React.FC<HistorialVisitasProps> = ({ visitas, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            Historial de Visitas
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {visitas.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No hay visitas registradas
            </p>
          ) : (
            visitas.map((visita) => (
              <div
                key={visita.id}
                className="border-b py-4 last:border-b-0"
              >
                <p className="font-semibold">
                  Fecha: {new Date(visita.fecha.seconds * 1000).toLocaleDateString()}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Estado: {visita.completada ? 'Completada' : 'No completada'}
                </p>
                {visita.tiempoVisita && (
                  <p className="mt-1 text-sm text-gray-600">
                    Duración: {visita.tiempoVisita} minutos
                  </p>
                )}
                {visita.notas && (
                  <div className="mt-2 bg-gray-50 p-2 rounded">
                    <p className="text-sm text-gray-700">
                      Notas: {visita.notas}
                    </p>
                  </div>
                )}
                {visita.productosEntregados && visita.productosEntregados.length > 0 && (
                  <div className="mt-2">
                    <p className="font-semibold text-sm">Productos entregados:</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                      {visita.productosEntregados.map((producto, index) => (
                        <li key={index}>
                          {producto.producto}: {producto.cantidad} unidades
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {visita.ubicacionCompletado && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">
                      Ubicación: {visita.ubicacionCompletado.lat.toFixed(6)}, {visita.ubicacionCompletado.lng.toFixed(6)}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}; 