import React, { useState, useCallback, useEffect } from 'react';
import { ClienteConRuta } from '../../types';

interface IniciarRutaProps {
  clientes: ClienteConRuta[];
  className?: string;
  onStartRoute?: () => void;
  onEndRoute?: () => void;
  onUpdateCliente?: (clienteId: string, estado: 'pendiente' | 'completado' | 'cancelado') => void;
  onReorderRoute?: (clientesOrdenados: ClienteConRuta[]) => void;
  ubicacionActual?: { lat: number; lng: number };
}

interface PuntoRuta {
  tipo: 'inicio' | 'fin';
  coords: { lat: number; lng: number };
  nombre: string;
}

export const IniciarRuta: React.FC<IniciarRutaProps> = ({
  clientes,
  className = '',
  onStartRoute,
  onEndRoute,
  onUpdateCliente,
  onReorderRoute,
  ubicacionActual
}) => {
  const [isActive, setIsActive] = useState(false);
  const [clientesCompletados, setClientesCompletados] = useState(0);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [puntoInicio, setPuntoInicio] = useState<PuntoRuta | null>(
    ubicacionActual 
      ? { 
          tipo: 'inicio', 
          coords: ubicacionActual,
          nombre: 'Mi ubicación actual'
        } 
      : null
  );
  const [puntoFin, setPuntoFin] = useState<PuntoRuta | null>(null);

  // Función para calcular distancia entre dos puntos
  const calcularDistancia = useCallback((coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = toRad(coord2.lat - coord1.lat);
    const dLon = toRad(coord2.lng - coord1.lng);
    const lat1 = toRad(coord1.lat);
    const lat2 = toRad(coord2.lat);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Función para convertir grados a radianes
  const toRad = useCallback((value: number): number => {
    return value * Math.PI / 180;
  }, []);

  // Función para ordenar clientes por distancia
  const ordenarClientesPorDistancia = useCallback((
    clientesAOrdenar: ClienteConRuta[],
    puntoReferencia: { coords: { lat: number; lng: number } },
    mantenerPrimero = false
  ): ClienteConRuta[] => {
    const clientesConCoordenadas = clientesAOrdenar.filter(c => c.coords);
    
    if (clientesConCoordenadas.length === 0) return clientesAOrdenar;

    if (mantenerPrimero) {
      const [primero, ...resto] = clientesConCoordenadas;
      const restoOrdenado = resto.sort((a, b) => {
        if (!a.coords || !b.coords) return 0;
        const distA = calcularDistancia(puntoReferencia.coords, a.coords);
        const distB = calcularDistancia(puntoReferencia.coords, b.coords);
        return distA - distB;
      });
      return [primero, ...restoOrdenado];
    }

    return clientesConCoordenadas.sort((a, b) => {
      if (!a.coords || !b.coords) return 0;
      const distA = calcularDistancia(puntoReferencia.coords, a.coords);
      const distB = calcularDistancia(puntoReferencia.coords, b.coords);
      return distA - distB;
    });
  }, [calcularDistancia]);

  // Efecto para reordenar la ruta cuando cambian los puntos de inicio/fin
  useEffect(() => {
    if (!onReorderRoute || !clientes.length) return;

    // Evitar reordenar si no hay puntos de inicio o fin seleccionados
    if (!puntoInicio && !puntoFin) return;

    let clientesOrdenados = [...clientes];
    let huboReordenamiento = false;

    // Si hay punto de inicio, encontrar el cliente más cercano para empezar
    if (puntoInicio) {
      const ordenados = ordenarClientesPorDistancia(clientesOrdenados, puntoInicio);
      if (JSON.stringify(ordenados) !== JSON.stringify(clientesOrdenados)) {
        clientesOrdenados = ordenados;
        huboReordenamiento = true;
      }
    }

    // Si hay punto final, reorganizar para que el último cliente sea el más cercano al punto final
    if (puntoFin) {
      const ordenados = ordenarClientesPorDistancia(clientesOrdenados, puntoFin, true);
      if (JSON.stringify(ordenados) !== JSON.stringify(clientesOrdenados)) {
        clientesOrdenados = ordenados;
        huboReordenamiento = true;
      }
    }

    // Solo actualizar si hubo cambios reales en el orden
    if (huboReordenamiento) {
      onReorderRoute(clientesOrdenados);
    }
  }, [puntoInicio, puntoFin, clientes, onReorderRoute, ordenarClientesPorDistancia]);

  const handleStartRoute = useCallback(() => {
    setShowConfigModal(true);
  }, []);

  const handleConfirmStart = useCallback(() => {
    setIsActive(true);
    setShowConfigModal(false);
    onStartRoute?.();

    // Construir la URL de Google Maps con waypoints
    if (clientes.length > 0) {
      let url = 'https://www.google.com/maps/dir/?api=1&travelmode=driving';
      
      // Punto de inicio
      if (puntoInicio) {
        url += `&origin=${puntoInicio.coords.lat},${puntoInicio.coords.lng}`;
      }

      // Destino (último punto o punto final configurado)
      const destino = puntoFin?.coords || clientes[clientes.length - 1].coords;
      if (destino) {
        url += `&destination=${destino.lat},${destino.lng}`;
      }

      // Waypoints (puntos intermedios)
      const waypoints = clientes
        .slice(0, -1)
        .filter(c => c.coords)
        .map(c => `${c.coords?.lat},${c.coords?.lng}`);
      
      if (waypoints.length > 0) {
        url += `&waypoints=${waypoints.join('|')}`;
      }

      window.open(url, '_blank');
    }
  }, [clientes, puntoInicio, puntoFin, onStartRoute]);

  const handleEndRoute = useCallback(() => {
    setIsActive(false);
    setPuntoInicio(null);
    setPuntoFin(null);
    onEndRoute?.();
  }, [onEndRoute]);

  const handleClienteCompletado = useCallback((cliente: ClienteConRuta) => {
    if (cliente.estado !== 'completado' && cliente.id && onUpdateCliente) {
      onUpdateCliente(cliente.id, 'completado');
      setClientesCompletados(prev => prev + 1);
    }
  }, [onUpdateCliente]);

  const progreso = (clientesCompletados / clientes.length) * 100;

  return (
    <>
      <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Ruta de Entregas
            </h3>
            <p className="text-sm text-gray-600">
              {clientesCompletados} de {clientes.length} entregas completadas
            </p>
          </div>
          {!isActive ? (
            <button
              onClick={handleStartRoute}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center space-x-2"
            >
              <span className="material-icons text-xl">navigation</span>
              <span>Comenzar Ruta</span>
            </button>
          ) : (
            <button
              onClick={handleEndRoute}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center space-x-2"
            >
              <span className="material-icons text-xl">stop</span>
              <span>Finalizar Ruta</span>
            </button>
          )}
        </div>

        {/* Barra de progreso */}
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300 ease-in-out"
            style={{ width: `${progreso}%` }}
          />
        </div>

        {/* Lista de clientes */}
        <div className="mt-4 space-y-2">
          {clientes.map((cliente, index) => (
            <div
              key={cliente.id}
              className={`flex items-center justify-between p-2 rounded-lg ${
                cliente.estado === 'completado' ? 'bg-green-50' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-sm ${
                  cliente.estado === 'completado' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {index + 1}
                </span>
                <span className="text-gray-900">{cliente.nombre}</span>
              </div>
              <div className="flex items-center space-x-2">
                {isActive && (
                  <>
                    <button
                      onClick={() => {
                        if (cliente.coords) {
                          // Abrir navegación a este cliente
                          const destination = `${cliente.coords.lat},${cliente.coords.lng}`;
                          window.open(
                            `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`,
                            '_blank'
                          );
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Navegar"
                    >
                      <span className="material-icons text-xl">directions</span>
                    </button>
                    <button
                      onClick={() => handleClienteCompletado(cliente)}
                      className={`p-1 ${
                        cliente.estado === 'completado'
                          ? 'text-green-600 hover:text-green-800'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                      title="Marcar como completado"
                      disabled={cliente.estado === 'completado'}
                    >
                      <span className="material-icons text-xl">
                        {cliente.estado === 'completado' ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de configuración de ruta */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Configurar Ruta</h3>
            
            {/* Punto de inicio */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Punto de inicio
              </label>
              <select
                className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={puntoInicio?.nombre || ''}
                onChange={(e) => {
                  if (e.target.value === 'ubicacion_actual' && ubicacionActual) {
                    setPuntoInicio({
                      tipo: 'inicio',
                      coords: ubicacionActual,
                      nombre: 'Mi ubicación actual'
                    });
                  } else if (e.target.value) {
                    const cliente = clientes.find(c => c.id === e.target.value);
                    if (cliente && cliente.coords) {
                      setPuntoInicio({
                        tipo: 'inicio',
                        coords: cliente.coords,
                        nombre: cliente.nombre
                      });
                    }
                  } else {
                    setPuntoInicio(null);
                  }
                }}
              >
                <option value="">Seleccionar punto de inicio</option>
                {ubicacionActual && (
                  <option value="ubicacion_actual">Mi ubicación actual</option>
                )}
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Punto final */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Punto final (opcional)
              </label>
              <select
                className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={puntoFin?.nombre || ''}
                onChange={(e) => {
                  if (e.target.value === 'ubicacion_actual' && ubicacionActual) {
                    setPuntoFin({
                      tipo: 'fin',
                      coords: ubicacionActual,
                      nombre: 'Mi ubicación actual'
                    });
                  } else if (e.target.value) {
                    const cliente = clientes.find(c => c.id === e.target.value);
                    if (cliente && cliente.coords) {
                      setPuntoFin({
                        tipo: 'fin',
                        coords: cliente.coords,
                        nombre: cliente.nombre
                      });
                    }
                  } else {
                    setPuntoFin(null);
                  }
                }}
              >
                <option value="">Seleccionar punto final</option>
                {ubicacionActual && (
                  <option value="ubicacion_actual">Mi ubicación actual</option>
                )}
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmStart}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Comenzar Ruta
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}; 