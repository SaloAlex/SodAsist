import React, { useState } from 'react';
import { 
  Calendar, 
  Filter, 
  X, 
  ChevronDown, 
  MapPin, 
  User, 
  Clock,
  RotateCcw,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FiltrosReporte } from '../../services/reportesService';
import { PeriodoPredefinido } from '../../hooks/useReportes';

interface FiltrosReportesProps {
  filtros: FiltrosReporte;
  onFiltrosChange: (filtros: Partial<FiltrosReporte>) => void;
  onAplicarPeriodo: (periodo: PeriodoPredefinido) => void;
  onExportar?: (tipo: 'pdf' | 'csv') => void;
  onReset?: () => void;
  loading?: boolean;
  zonas?: string[];
  clientes?: Array<{ id: string; nombre: string; zona?: string }>;
}

interface PeriodoPredefindo {
  label: string;
  value: PeriodoPredefinido;
  descripcion: string;
}

const PERIODOS_PREDEFINIDOS: PeriodoPredefindo[] = [
  { label: 'Hoy', value: 'hoy', descripcion: 'Solo el día actual' },
  { label: 'Última semana', value: 'semana', descripcion: 'Últimos 7 días' },
  { label: 'Este mes', value: 'mes', descripcion: 'Mes actual completo' },
  { label: 'Último trimestre', value: 'trimestre', descripcion: 'Últimos 3 meses' },
  { label: 'Este año', value: 'año', descripcion: 'Año actual completo' },
  { label: 'Personalizado', value: 'personalizado', descripcion: 'Seleccionar fechas específicas' }
];

export const FiltrosReportes: React.FC<FiltrosReportesProps> = ({
  filtros,
  onFiltrosChange,
  onAplicarPeriodo,
  onExportar,
  onReset,
  loading = false,
  zonas = [],
  clientes = []
}) => {
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<PeriodoPredefinido>('mes');
  const [menuPeriodoAbierto, setMenuPeriodoAbierto] = useState(false);
  const [menuZonaAbierto, setMenuZonaAbierto] = useState(false);
  const [menuClienteAbierto, setMenuClienteAbierto] = useState(false);
  const [menuExportarAbierto, setMenuExportarAbierto] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState('');

  // Filtrar clientes por búsqueda
  const clientesFiltrados = clientes.filter(cliente =>
    cliente.nombre.toLowerCase().includes(busquedaCliente.toLowerCase())
  );

  // Obtener nombre del cliente seleccionado
  const clienteSeleccionado = clientes.find(c => c.id === filtros.clienteId);

  // Formatear fechas para inputs
  const formatearFechaInput = (fecha: Date) => {
    return format(fecha, 'yyyy-MM-dd');
  };

  // Manejar cambio de período predefinido
  const handlePeriodoChange = (periodo: PeriodoPredefinido) => {
    setPeriodoSeleccionado(periodo);
    onAplicarPeriodo(periodo);
    setMenuPeriodoAbierto(false);
  };

  // Manejar cambio de fechas manuales
  const handleFechaChange = (tipo: 'inicio' | 'fin', fecha: string) => {
    const nuevaFecha = new Date(fecha);
    if (tipo === 'inicio') {
      onFiltrosChange({ fechaInicio: nuevaFecha });
    } else {
      onFiltrosChange({ fechaFin: nuevaFecha });
    }
    setPeriodoSeleccionado('personalizado');
  };

  // Reset filtros
  const handleReset = () => {
    setPeriodoSeleccionado('mes');
    setBusquedaCliente('');
    onAplicarPeriodo('mes');
    onFiltrosChange({
      zona: undefined,
      clienteId: undefined
    });
    if (onReset) onReset();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
      {/* Fila principal de filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Filtros básicos */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Selector de período */}
          <div className="relative">
            <button
              onClick={() => setMenuPeriodoAbierto(!menuPeriodoAbierto)}
              className="flex items-center justify-between w-full sm:w-48 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                <span>{PERIODOS_PREDEFINIDOS.find(p => p.value === periodoSeleccionado)?.label || 'Período'}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>

            {menuPeriodoAbierto && (
              <div className="absolute z-10 top-full left-0 mt-1 w-64 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
                {PERIODOS_PREDEFINIDOS.map((periodo) => (
                  <button
                    key={periodo.value}
                    onClick={() => handlePeriodoChange(periodo.value)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">
                      {periodo.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {periodo.descripcion}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selector de zona */}
          {zonas.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setMenuZonaAbierto(!menuZonaAbierto)}
                className="flex items-center justify-between w-full sm:w-40 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                  <span className="truncate">
                    {filtros.zona || 'Todas las zonas'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>

              {menuZonaAbierto && (
                <div className="absolute z-10 top-full left-0 mt-1 w-48 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <button
                    onClick={() => {
                      onFiltrosChange({ zona: undefined });
                      setMenuZonaAbierto(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white first:rounded-t-lg"
                  >
                    Todas las zonas
                  </button>
                  {zonas.map((zona) => (
                    <button
                      key={zona}
                      onClick={() => {
                        onFiltrosChange({ zona });
                        setMenuZonaAbierto(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                    >
                      {zona}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Filtros avanzados toggle */}
          <button
            onClick={() => setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)}
            className="flex items-center px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros avanzados
          </button>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          {/* Botón reset */}
          <button
            onClick={handleReset}
            className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={loading}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </button>

          {/* Botón exportar */}
          {onExportar && (
            <div className="relative">
              <button
                onClick={() => setMenuExportarAbierto(!menuExportarAbierto)}
                className="flex items-center px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                disabled={loading}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
                <ChevronDown className="w-4 h-4 ml-2" />
              </button>

              {menuExportarAbierto && (
                <div className="absolute z-10 top-full right-0 mt-1 w-32 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
                  <button
                    onClick={() => {
                      onExportar('pdf');
                      setMenuExportarAbierto(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white first:rounded-t-lg"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => {
                      onExportar('csv');
                      setMenuExportarAbierto(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white last:rounded-b-lg"
                  >
                    CSV
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filtros avanzados */}
      {mostrarFiltrosAvanzados && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Fechas personalizadas */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Fecha inicio
              </label>
              <input
                type="date"
                value={formatearFechaInput(filtros.fechaInicio)}
                onChange={(e) => handleFechaChange('inicio', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Fecha fin
              </label>
              <input
                type="date"
                value={formatearFechaInput(filtros.fechaFin)}
                onChange={(e) => handleFechaChange('fin', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>

            {/* Selector de cliente */}
            {clientes.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cliente específico
                </label>
                <div className="relative">
                  <button
                    onClick={() => setMenuClienteAbierto(!menuClienteAbierto)}
                    className="flex items-center justify-between w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  >
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                      <span className="truncate">
                        {clienteSeleccionado?.nombre || 'Todos los clientes'}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>

                  {menuClienteAbierto && (
                    <div className="absolute z-10 top-full left-0 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
                      {/* Búsqueda de clientes */}
                      <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                        <input
                          type="text"
                          placeholder="Buscar cliente..."
                          value={busquedaCliente}
                          onChange={(e) => setBusquedaCliente(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      {/* Lista de clientes */}
                      <div className="max-h-48 overflow-y-auto">
                        <button
                          onClick={() => {
                            onFiltrosChange({ clienteId: undefined });
                            setMenuClienteAbierto(false);
                            setBusquedaCliente('');
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                        >
                          Todos los clientes
                        </button>
                        {clientesFiltrados.map((cliente) => (
                          <button
                            key={cliente.id}
                            onClick={() => {
                              onFiltrosChange({ clienteId: cliente.id });
                              setMenuClienteAbierto(false);
                              setBusquedaCliente('');
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                          >
                            <div className="font-medium">{cliente.nombre}</div>
                            {cliente.zona && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {cliente.zona}
                              </div>
                            )}
                          </button>
                        ))}
                        {clientesFiltrados.length === 0 && busquedaCliente && (
                          <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                            No se encontraron clientes
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Resumen de filtros activos */}
          <div className="mt-4 flex flex-wrap gap-2">
            {filtros.zona && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                <MapPin className="w-3 h-3 mr-1" />
                Zona: {filtros.zona}
                <button
                  onClick={() => onFiltrosChange({ zona: undefined })}
                  className="ml-1 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            
            {filtros.clienteId && clienteSeleccionado && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                <User className="w-3 h-3 mr-1" />
                Cliente: {clienteSeleccionado.nombre}
                <button
                  onClick={() => onFiltrosChange({ clienteId: undefined })}
                  className="ml-1 hover:text-green-600 dark:hover:text-green-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {periodoSeleccionado === 'personalizado' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                <Clock className="w-3 h-3 mr-1" />
                {format(filtros.fechaInicio, 'dd/MM/yy', { locale: es })} - {format(filtros.fechaFin, 'dd/MM/yy', { locale: es })}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Indicador de loading */}
      {loading && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              Cargando datos...
            </span>
          </div>
        </div>
      )}

      {/* Cerrar menus al hacer click fuera */}
      {(menuPeriodoAbierto || menuZonaAbierto || menuClienteAbierto || menuExportarAbierto) && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => {
            setMenuPeriodoAbierto(false);
            setMenuZonaAbierto(false);
            setMenuClienteAbierto(false);
            setMenuExportarAbierto(false);
          }}
        />
      )}
    </div>
  );
}; 