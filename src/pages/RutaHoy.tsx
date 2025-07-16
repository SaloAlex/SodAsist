import React, { useState, useEffect } from 'react';
import { useRutaHoy } from '../hooks/useRutaHoy';
import { MapaRuta } from '../components/entregas/MapaRuta';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided } from '@hello-pangea/dnd';
import { FaMapMarkedAlt, FaFileExport, FaUndo, FaExclamationTriangle, FaRoute, FaClock, FaMapMarkerAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { HistorialVisitas } from '../components/entregas/HistorialVisitas';
import { ClienteDetalles } from '../components/entregas/ClienteDetalles';
import { ClienteConRuta, Visita } from '../types';
import { useAuthStore } from '../store/authStore';

type VisitaHistorial = Visita;

interface EstadisticasRuta {
  clientesTotal: number;
  clientesCompletados: number;
  distanciaTotal: string;
  tiempoEstimado: string;
  progreso: number;
}

export const RutaHoy: React.FC = () => {
  const {
    clientes,
    rutaOptimizada,
    loading: rutaLoading,
    optimizing,
    visitasCompletadas,
    error: rutaError,
    reoptimizarRuta,
    marcarVisita,
    agregarNota,
    obtenerHistorialVisitas,
    actualizarOrdenManual,
    filtrarPorZona,
    exportarRuta,
  } = useRutaHoy();

  const { loading: authLoading } = useAuthStore();

  const [mostrarMapa, setMostrarMapa] = useState(true);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string | null>(null);
  const [historialVisible, setHistorialVisible] = useState(false);
  const [historialVisitas, setHistorialVisitas] = useState<VisitaHistorial[]>([]);
  const [zonaSeleccionada, setZonaSeleccionada] = useState('');
  const [clienteEnMapa, setClienteEnMapa] = useState<ClienteConRuta | null>(null);
  const [estadisticas, setEstadisticas] = useState<EstadisticasRuta>({
    clientesTotal: 0,
    clientesCompletados: 0,
    distanciaTotal: '0 km',
    tiempoEstimado: '0 min',
    progreso: 0
  });

  useEffect(() => {
    if (rutaOptimizada && clientes.length > 0) {
      const completados = Array.from(visitasCompletadas.values()).length;
      setEstadisticas({
        clientesTotal: clientes.length,
        clientesCompletados: completados,
        distanciaTotal: `${(rutaOptimizada.distanciaTotal / 1000).toFixed(1)} km`,
        tiempoEstimado: `${Math.round(rutaOptimizada.tiempoEstimadoTotal / 60)} min`,
        progreso: (completados / clientes.length) * 100
      });
    }
  }, [rutaOptimizada, clientes, visitasCompletadas]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(clientes);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    actualizarOrdenManual(items.map(item => item.id!));
  };

  const handleVerHistorial = async (clienteId: string) => {
    setClienteSeleccionado(clienteId);
    const visitas = await obtenerHistorialVisitas(clienteId);
    setHistorialVisitas(visitas);
    setHistorialVisible(true);
  };

  const handleExportar = async () => {
    try {
      const blob = await exportarRuta();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ruta-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Ruta exportada correctamente');
    } catch (error) {
      console.error('Error al exportar ruta:', error);
      toast.error('Error al exportar la ruta');
    }
  };

  const handleFiltrarZona = (zona: string) => {
    setZonaSeleccionada(zona);
    filtrarPorZona(zona);
  };

  const handleClienteClick = (cliente: ClienteConRuta) => {
    setClienteEnMapa(cliente);
  };

  if (authLoading || rutaLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600 dark:text-gray-300">Cargando datos...</p>
      </div>
    );
  }

  if (rutaError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-red-500">
        <FaExclamationTriangle className="text-5xl mb-4" />
        <p className="text-xl font-bold mb-4">Error al cargar la ruta</p>
        <p className="text-center mb-4">{rutaError.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (clientes.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4 dark:text-white">Ruta de Hoy</h1>
          <p className="text-gray-600 dark:text-gray-300">No hay clientes programados para hoy</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold dark:text-white mb-2">Ruta de Hoy</h1>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center">
              <FaRoute className="mr-2 text-blue-500" />
              <span className="dark:text-gray-300">Distancia: {estadisticas.distanciaTotal}</span>
            </div>
            <div className="flex items-center">
              <FaClock className="mr-2 text-green-500" />
              <span className="dark:text-gray-300">Tiempo est.: {estadisticas.tiempoEstimado}</span>
            </div>
            <div className="flex items-center">
              <FaMapMarkerAlt className="mr-2 text-red-500" />
              <span className="dark:text-gray-300">
                Completados: {estadisticas.clientesCompletados}/{estadisticas.clientesTotal}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setMostrarMapa(!mostrarMapa)}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            <FaMapMarkedAlt className="mr-2" />
            {mostrarMapa ? 'Ocultar Mapa' : 'Ver Mapa'}
          </button>
          <button
            onClick={handleExportar}
            className="flex items-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            <FaFileExport className="mr-2" />
            Exportar
          </button>
          <button
            onClick={reoptimizarRuta}
            disabled={optimizing}
            className="flex items-center px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 transition-colors"
          >
            <FaUndo className="mr-2" />
            Reoptimizar
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <select
              value={zonaSeleccionada}
              onChange={(e) => handleFiltrarZona(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 transition-colors"
            >
              <option value="">Todas las zonas</option>
              {rutaOptimizada?.zonas.map((zona) => (
                <option key={zona} value={zona}>
                  {zona}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${estadisticas.progreso}%` }}
            />
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="clientes">
              {(provided: DroppableProvided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {clientes.map((cliente, index) => (
                    <Draggable
                      key={cliente.id}
                      draggableId={cliente.id!}
                      index={index}
                    >
                      {(provided: DraggableProvided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`
                            transition-all duration-200 transform hover:scale-[1.02]
                            ${visitasCompletadas.has(cliente.id!) ? 'border-l-4 border-green-500' : ''}
                            ${clienteEnMapa?.id === cliente.id ? 'ring-2 ring-blue-500' : ''}
                          `}
                          onClick={() => handleClienteClick(cliente)}
                        >
                          <ClienteDetalles
                            cliente={cliente}
                            visitaCompletada={visitasCompletadas.has(cliente.id!)}
                            orden={index + 1}
                            onMarcarVisita={(estado) => marcarVisita(cliente.id!, estado)}
                            onVerHistorial={() => handleVerHistorial(cliente.id!)}
                            onAgregarNota={(nota) => agregarNota(cliente.id!, nota)}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {mostrarMapa && (
          <div className="lg:sticky lg:top-4">
            <MapaRuta 
              clientes={clientes} 
              className="rounded-lg shadow-lg overflow-hidden"
              onClienteClick={handleClienteClick}
              mostrarEstadisticas={true}
            />
          </div>
        )}
      </div>

      {/* Modal de Historial */}
      {historialVisible && clienteSeleccionado && (
        <HistorialVisitas
          visitas={historialVisitas}
          onClose={() => {
            setHistorialVisible(false);
            setClienteSeleccionado(null);
            setHistorialVisitas([]);
          }}
        />
      )}
    </div>
  );
};