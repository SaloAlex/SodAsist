import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ClienteConRuta, EstadoVisita } from '../../types';
import { FaRoute, FaCheckCircle, FaRegCircle } from 'react-icons/fa';

interface IniciarRutaProps {
  clientes: ClienteConRuta[];
  className?: string;
  onStartRoute?: () => void;
  onEndRoute?: () => void;
  onUpdateCliente?: (clienteId: string, estado: EstadoVisita) => void;
  onReorderRoute?: (clientesOrdenados: ClienteConRuta[]) => void;
  ubicacionActual?: { lat: number; lng: number };
}

interface PuntoRuta {
  tipo: 'inicio' | 'fin';
  coords: { lat: number; lng: number };
  nombre: string;
}

// Constantes
const EARTH_RADIUS_KM = 6371;
const RAD_CONVERSION = Math.PI / 180;

// Funciones de utilidad
const toRad = (value: number): number => value * RAD_CONVERSION;

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
    const dLat = toRad(coord2.lat - coord1.lat);
    const dLon = toRad(coord2.lng - coord1.lng);
    const lat1 = toRad(coord1.lat);
    const lat2 = toRad(coord2.lat);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return EARTH_RADIUS_KM * c;
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

  // URL de Google Maps memoizada
  const googleMapsUrl = useMemo(() => {
    if (!clientes.length) return '';

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

    return url;
  }, [clientes, puntoInicio, puntoFin]);

  const handleStartRoute = useCallback(() => {
    setShowConfigModal(true);
  }, []);

  const handleConfirmStart = useCallback(() => {
    setIsActive(true);
    setShowConfigModal(false);
    onStartRoute?.();

    // Abrir Google Maps si hay una URL válida
    if (googleMapsUrl) {
      window.open(googleMapsUrl, '_blank');
    }
  }, [googleMapsUrl, onStartRoute]);

  const handleEndRoute = useCallback(() => {
    setIsActive(false);
    setPuntoInicio(null);
    setPuntoFin(null);
    onEndRoute?.();
  }, [onEndRoute]);

  const handleClienteCompletado = useCallback((cliente: ClienteConRuta) => {
    if (cliente.estado !== EstadoVisita.COMPLETADA && cliente.id && onUpdateCliente) {
      onUpdateCliente(cliente.id, EstadoVisita.COMPLETADA);
      setClientesCompletados(prev => prev + 1);
    }
  }, [onUpdateCliente]);

  const progreso = (clientesCompletados / clientes.length) * 100;

  return (
    <>
      <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              Ruta de Entregas
            </h3>
            <p className="text-sm text-gray-600">
              {clientesCompletados} de {clientes.length} entregas completadas
            </p>
          </div>
          <div className="flex-shrink-0">
            {!isActive ? (
              <button
                onClick={handleStartRoute}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center gap-2 text-sm sm:text-base transition-colors"
              >
                <FaRoute className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Comenzar Ruta</span>
                <span className="sm:hidden">Iniciar</span>
              </button>
            ) : (
              <button
                onClick={handleEndRoute}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center justify-center gap-2 text-sm sm:text-base transition-colors"
              >
                <FaCheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Finalizar Ruta</span>
                <span className="sm:hidden">Finalizar</span>
              </button>
            )}
          </div>
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
              className={`flex items-center justify-between p-3 sm:p-2 rounded-lg transition-colors ${
                cliente.estado === EstadoVisita.COMPLETADA ? 'bg-green-50' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <span className={`flex-shrink-0 w-8 h-8 sm:w-6 sm:h-6 flex items-center justify-center rounded-full text-sm font-medium ${
                  cliente.estado === EstadoVisita.COMPLETADA 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {index + 1}
                </span>
                <span className="text-gray-900 truncate text-sm sm:text-base">{cliente.nombre}</span>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                {isActive && (
                  <>
                    <button
                      onClick={() => {
                        if (cliente.coords) {
                          const destination = `${cliente.coords.lat},${cliente.coords.lng}`;
                          window.open(
                            `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`,
                            '_blank'
                          );
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800 p-2 sm:p-1 rounded-lg hover:bg-blue-50 transition-colors"
                      title="Navegar"
                    >
                      <FaRoute className="h-5 w-5 sm:h-4 sm:w-4" />
                    </button>
                    <button
                      onClick={() => handleClienteCompletado(cliente)}
                      className={`p-2 sm:p-1 rounded-lg transition-colors ${
                        cliente.estado === EstadoVisita.COMPLETADA
                          ? 'text-green-600 hover:text-green-800 hover:bg-green-50'
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                      }`}
                      title="Marcar como completado"
                      disabled={cliente.estado === EstadoVisita.COMPLETADA}
                    >
                      {cliente.estado === EstadoVisita.COMPLETADA ? (
                        <FaCheckCircle className="h-5 w-5 sm:h-4 sm:w-4" />
                      ) : (
                        <FaRegCircle className="h-5 w-5 sm:h-4 sm:w-4" />
                      )}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-semibold mb-4">Configurar Ruta</h3>
            
            {/* Punto de inicio */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Punto de inicio
              </label>
              <select
                className="w-full border border-gray-300 rounded-md shadow-sm p-3 sm:p-2 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full border border-gray-300 rounded-md shadow-sm p-3 sm:p-2 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <button
                onClick={() => setShowConfigModal(false)}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmStart}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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