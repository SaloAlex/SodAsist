import React, { useState } from 'react';
import { useRutaHoy } from '../hooks/useRutaHoy';
import { MapaRuta } from '../components/entregas/MapaRuta';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided } from 'react-beautiful-dnd';
import { FaMapMarkedAlt, FaFileExport, FaUndo, FaExclamationTriangle } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { HistorialVisitas } from '../components/entregas/HistorialVisitas';
import { ClienteDetalles } from '../components/entregas/ClienteDetalles';
import { Visita } from '../types';
import { useAuthStore } from '../store/authStore';

type VisitaHistorial = Visita;

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

  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string | null>(null);
  const [historialVisible, setHistorialVisible] = useState(false);
  const [historialVisitas, setHistorialVisitas] = useState<VisitaHistorial[]>([]);
  const [zonaSeleccionada, setZonaSeleccionada] = useState('');

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

  if (authLoading || rutaLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Cargando datos...</p>
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
          <h1 className="text-3xl font-bold mb-4">Ruta de Hoy</h1>
          <p className="text-gray-600">No hay clientes programados para hoy</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Ruta de Hoy</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setMostrarMapa(!mostrarMapa)}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <FaMapMarkedAlt className="mr-2" />
            {mostrarMapa ? 'Ocultar Mapa' : 'Ver Mapa'}
          </button>
          <button
            onClick={handleExportar}
            className="flex items-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            <FaFileExport className="mr-2" />
            Exportar
          </button>
          <button
            onClick={reoptimizarRuta}
            disabled={optimizing}
            className="flex items-center px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            <FaUndo className="mr-2" />
            Reoptimizar
          </button>
        </div>
      </div>

      {mostrarMapa && (
        <div className="mb-8">
          <MapaRuta clientes={clientes} />
        </div>
      )}

      <div className="mb-6">
        <select
          value={zonaSeleccionada}
          onChange={(e) => handleFiltrarZona(e.target.value)}
          className="w-full md:w-64 p-2 border rounded"
        >
          <option value="">Todas las zonas</option>
          {rutaOptimizada?.zonas.map((zona) => (
            <option key={zona} value={zona}>
              {zona}
            </option>
          ))}
        </select>
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
                      className={visitasCompletadas.has(cliente.id!) ? 'border-l-4 border-green-500' : ''}
                    >
                      <ClienteDetalles
                        cliente={cliente}
                        visitaCompletada={visitasCompletadas.has(cliente.id!)}
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