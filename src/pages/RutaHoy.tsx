import React, { useState, useMemo, useEffect } from 'react';
import { useRutaHoy } from '../hooks/useRutaHoy';
import { MapaRuta } from '../components/entregas/MapaRuta';
import { ClienteDetalles } from '../components/entregas/ClienteDetalles';
import { IniciarRuta } from '../components/entregas/IniciarRuta';
import { useAuthStore } from '../store/authStore';
import { EstadoVisita, ClienteConRuta, Visita } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided } from '@hello-pangea/dnd';
import { FaFileExport, FaRoute, FaClock, FaMapMarkerAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { HistorialVisitas } from '../components/entregas/HistorialVisitas';

type VisitaHistorial = Visita;

export const RutaHoy: React.FC = () => {
  console.log('🚀 RutaHoy: Componente iniciando renderizado');
  
  const {
    clientes,
    visitasCompletadas,
    loading,
    ubicacionActual,
    rutaOptimizada,
    optimizing,
    reoptimizarRuta,
    marcarVisita,
    agregarNota,
    obtenerHistorialVisitas,
    exportarRuta,
    actualizarOrdenManual,
    filtrarPorZona,
    zonaActual,
    error,
    startLocationTracking
  } = useRutaHoy();
  
  console.log('✅ RutaHoy: Hook useRutaHoy ejecutado correctamente', {
    clientes: clientes?.length || 0,
    loading,
    error: !!error,
    ubicacionActual: !!ubicacionActual
  });
  
  // DEBUG: Verificar cuando se ejecuta el componente
  console.log('🔍 RutaHoy: Estado del componente:', {
    clientesLength: clientes?.length || 0,
    loading,
    error: !!error,
    ubicacionActual: !!ubicacionActual,
    rutaOptimizada: !!rutaOptimizada
  });


  const { loading: authLoading, userData } = useAuthStore();

  const [mostrarMapa, setMostrarMapa] = useState(true);
  const [menuExportAbierto, setMenuExportAbierto] = useState(false);
  const [clienteEnMapa, setClienteEnMapa] = useState<ClienteConRuta | null>(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteConRuta | null>(null);
  const [historialVisible, setHistorialVisible] = useState(false);
  const [historialVisitas, setHistorialVisitas] = useState<VisitaHistorial[]>([]);

  // Calcular estadísticas
  const clientesCompletados = visitasCompletadas.size;
  const porcentajeCompletado = clientes.length > 0 ? ((clientesCompletados / clientes.length) * 100).toFixed(0) : '0';
  
  // DEBUG: Verificar estado de visitas
  

  // Calcular zonas disponibles
  const zonasDisponibles = useMemo(() => {
    const zonas = [...new Set(clientes.map(c => c.zona).filter(Boolean))];
    return zonas.length > 0 ? zonas : ['Centro', 'Norte', 'Sur', 'Este', 'Oeste'];
  }, [clientes]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(clientes);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    actualizarOrdenManual(items.map(item => item.id!));
  };

  const handleClienteClick = (cliente: ClienteConRuta) => {
    setClienteEnMapa(cliente);
  };

  const handleMarcarVisita = (clienteId: string) => (estado: EstadoVisita) => {
    marcarVisita(clienteId, estado);
  };

  const handleAgregarNota = (clienteId: string) => (nota: string) => {
    agregarNota(clienteId, nota);
  };

  const handleHistorial = async (cliente: ClienteConRuta) => {
    setClienteSeleccionado(cliente);
    const visitas = await obtenerHistorialVisitas(cliente.id!);
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
    } catch (error) {
      console.error('Error al exportar:', error);
    }
  };

  const handleExportarCSV = async () => {
    try {
      const { ExportService } = await import('../services/exportService');
      const exportData = {
        clientes,
        rutaOptimizada,
        visitasCompletadas,
        ubicacionActual,
        fechaRuta: new Date(),
        sodero: userData?.nombre || 'Sodero'
      };

      const blob = await ExportService.exportToCSV(exportData);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ruta-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setMenuExportAbierto(false);
    } catch (error) {
      console.error('Error al exportar CSV:', error);
      toast.error('Error al exportar CSV');
    }
  };

  const handleExportarHojaRuta = async () => {
    try {
      const { ExportService } = await import('../services/exportService');
      const exportData = {
        clientes,
        rutaOptimizada,
        visitasCompletadas,
        ubicacionActual,
        fechaRuta: new Date(),
        sodero: userData?.nombre || 'Sodero'
      };

      const blob = await ExportService.exportToRouteSheet(exportData);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hoja-ruta-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setMenuExportAbierto(false);
    } catch (error) {
      console.error('Error al exportar hoja de ruta:', error);
      toast.error('Error al exportar hoja de ruta');
    }
  };

  // Efecto para cerrar menús al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.menu-export') && !target.closest('.menu-mobile')) {
        setMenuExportAbierto(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600 dark:text-gray-300">Cargando datos...</p>
      </div>
    );
  }

  // Mostrar error si existe
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4 dark:text-white">Error al cargar la ruta</h1>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md mx-auto">
            <p className="text-red-800 dark:text-red-200 mb-4">
              {error.message || 'Error desconocido al cargar los datos'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (rutaOptimizada === null) {
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
    <div className="container mx-auto px-4 py-4 lg:py-8">
      {/* Header Desktop */}
      <div className="hidden lg:flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Ruta de Hoy
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {clientes.length} clientes • {clientesCompletados} completados ({porcentajeCompletado}%)
          </p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <button
              onClick={() => setMenuExportAbierto(!menuExportAbierto)}
              className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors menu-export min-h-[44px]"
            >
              <FaFileExport className="mr-2" />
              Exportar
            </button>
            
            {menuExportAbierto && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 z-20 menu-export">
                <button
                  onClick={handleExportar}
                  className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-gray-900 dark:text-gray-100 min-h-[44px]"
                >
                  <FaFileExport className="mr-2" />
                  Reporte Completo (PDF)
                </button>
                <button
                  onClick={handleExportarCSV}
                  className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-gray-900 dark:text-gray-100 min-h-[44px]"
                >
                  <FaFileExport className="mr-2" />
                  Datos (CSV)
                </button>
                <button
                  onClick={handleExportarHojaRuta}
                  className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-gray-900 dark:text-gray-100 min-h-[44px]"
                >
                  <FaFileExport className="mr-2" />
                  Hoja de Ruta (PDF)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Header Móvil */}
      <div className="lg:hidden">
        <div className="flex justify-between items-center">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
              Ruta de Hoy
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {clientes.length} clientes • {clientesCompletados} completados
            </p>
          </div>
          <div className="relative ml-4">
            <button
              onClick={() => setMenuExportAbierto(!menuExportAbierto)}
              className="flex items-center px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors min-h-[44px]"
            >
              <FaFileExport className="mr-2" />
              <span className="hidden xs:inline">Exportar</span>
              <span className="xs:hidden">📄</span>
            </button>
          </div>
        </div>

        {menuExportAbierto && (
          <div className="absolute right-4 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 z-20 menu-mobile">
            <button
              onClick={() => {
                handleExportar();
                setMenuExportAbierto(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-gray-900 dark:text-gray-100 min-h-[44px]"
            >
              <FaFileExport className="mr-3" />
              Reporte Completo (PDF)
            </button>
            <button
              onClick={() => {
                handleExportarCSV();
                setMenuExportAbierto(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-gray-900 dark:text-gray-100 min-h-[44px]"
            >
              <FaFileExport className="mr-3" />
              Datos (CSV)
            </button>
            <button
              onClick={() => {
                handleExportarHojaRuta();
                setMenuExportAbierto(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-gray-900 dark:text-gray-100 min-h-[44px]"
            >
              <FaFileExport className="mr-3" />
              Hoja de Ruta (PDF)
            </button>
          </div>
        )}
      </div>

      {/* Estadísticas móviles */}
      <div className="lg:hidden bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-4 mt-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center">
            <FaRoute className="mr-2 text-blue-500 flex-shrink-0" />
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Distancia</div>
              <div className="font-medium dark:text-white">{rutaOptimizada ? `${(rutaOptimizada.distanciaTotal / 1000).toFixed(1)} km` : '0 km'}</div>
            </div>
          </div>
          <div className="flex items-center">
            <FaClock className="mr-2 text-green-500 flex-shrink-0" />
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Tiempo</div>
              <div className="font-medium dark:text-white">{rutaOptimizada ? `${Math.floor(rutaOptimizada.tiempoEstimadoTotal / 3600)}h ${Math.floor((rutaOptimizada.tiempoEstimadoTotal % 3600) / 60)}m` : '0h 0m'}</div>
            </div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FaMapMarkerAlt className="mr-2 text-red-500" />
              <span className="text-sm dark:text-gray-300">Progreso</span>
            </div>
            <span className="text-sm font-medium dark:text-white">
              {clientesCompletados}/{clientes.length} ({porcentajeCompletado}%)
            </span>
          </div>
          <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(clientesCompletados / clientes.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Filtro de zona */}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filtrar por zona
            </label>
            <select
              value={zonaActual || ''}
              onChange={(e) => filtrarPorZona(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white min-h-[40px]"
            >
              <option value="">Todas las Zonas</option>
              {zonasDisponibles.map((zona) => (
                <option key={zona} value={zona}>{zona}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 lg:gap-8">
        {/* Lista de clientes */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Clientes del Día
              </h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {clientes.length} total
                </span>
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                  {clientesCompletados} completados
                </span>
              </div>
            </div>
            
            {/* Indicador de estado de la ruta */}
            {rutaOptimizada && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <FaRoute className="mr-2 text-blue-500" />
                      <span className="text-blue-700 dark:text-blue-300">
                        {(rutaOptimizada.distanciaTotal / 1000).toFixed(1)} km
                      </span>
                    </div>
                    <div className="flex items-center">
                      <FaClock className="mr-2 text-green-500" />
                      <span className="text-green-700 dark:text-green-300">
                        {Math.floor(rutaOptimizada.tiempoEstimadoTotal / 3600)}h {Math.floor((rutaOptimizada.tiempoEstimadoTotal % 3600) / 60)}m
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                    Ruta optimizada
                  </div>
                </div>
              </div>
            )}
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="clientes">
              {(provided: DroppableProvided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
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
                            bg-white dark:bg-gray-800 rounded-lg shadow-sm
                            transition-all duration-200 transform hover:scale-[1.01]
                            ${visitasCompletadas.has(cliente.id!) ? 'border-l-4 border-green-500' : ''}
                            ${clienteEnMapa?.id === cliente.id ? 'ring-2 ring-blue-500' : ''}
                          `}
                          onClick={() => handleClienteClick(cliente)}
                        >
                          <ClienteDetalles
                            cliente={cliente}
                            visitaCompletada={visitasCompletadas.has(cliente.id!)}
                            orden={index + 1}
                            onMarcarVisita={handleMarcarVisita(cliente.id!)}
                            onAgregarNota={handleAgregarNota(cliente.id!)}
                            onVerHistorial={() => handleHistorial(cliente)}
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

        {/* Mapa */}
        {mostrarMapa && (
          <div className="lg:sticky lg:top-8 space-y-4">
            <MapaRuta
              clientes={clientes}
              ubicacionActual={ubicacionActual}
              onOptimizarRuta={reoptimizarRuta}
              optimizing={optimizing}
              onToggleMapa={() => setMostrarMapa(!mostrarMapa)}
              mostrarMapa={mostrarMapa}
            />
            {/* Botón para comenzar ruta debajo del mapa */}
            <IniciarRuta
              clientes={clientes}
              ubicacionActual={ubicacionActual || undefined}
              onUpdateCliente={(clienteId, estado) => marcarVisita(clienteId, estado)}
              onReorderRoute={(clientesOrdenados) => actualizarOrdenManual(clientesOrdenados.map(c => c.id!))}
              onRequestLocation={startLocationTracking}
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* Modal de historial */}
      {historialVisible && clienteSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Historial de Visitas
              </h3>
              <HistorialVisitas
                visitas={historialVisitas}
                onClose={() => setHistorialVisible(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};