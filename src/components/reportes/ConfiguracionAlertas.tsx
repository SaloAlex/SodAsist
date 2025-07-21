import React, { useState } from 'react';
import { Bell, Mail, Smartphone, Save, X, Plus, Trash2, LucideProps } from 'lucide-react';

interface AlertaConfig {
  id: string;
  activa: boolean;
  tipo: 'ventas' | 'mora' | 'clientes' | 'inventario';
  umbral: number;
  condicion: 'mayor' | 'menor' | 'igual';
  frecuencia: 'inmediata' | 'diaria' | 'semanal';
  canales: ('email' | 'sms' | 'notificacion')[];
  destinatarios: string[];
  mensaje: string;
}

interface ConfiguracionAlertasProps {
  alertas: AlertaConfig[];
  onGuardar: (alertas: AlertaConfig[]) => void;
  onCerrar: () => void;
}

export const ConfiguracionAlertas: React.FC<ConfiguracionAlertasProps> = ({
  alertas: alertasIniciales = [],
  onGuardar,
  onCerrar
}) => {
  const [alertas, setAlertas] = useState<AlertaConfig[]>(alertasIniciales);
  const [editando, setEditando] = useState<string | null>(null);

  const tiposAlerta = [
    { value: 'ventas', label: 'Ventas Bajas', descripcion: 'Cuando las ventas caen por debajo del umbral' },
    { value: 'mora', label: 'Morosidad Alta', descripcion: 'Cuando el porcentaje de mora supera el límite' },
    { value: 'clientes', label: 'Clientes Inactivos', descripcion: 'Cuando hay muchos clientes sin comprar' },
    { value: 'inventario', label: 'Stock Bajo', descripcion: 'Cuando el inventario está por agotarse' }
  ];

  const canalesDisponibles = [
    { value: 'email', label: 'Email', icono: Mail },
    { value: 'sms', label: 'SMS', icono: Smartphone },
    { value: 'notificacion', label: 'Notificación', icono: Bell }
  ];

  const crearNuevaAlerta = (): AlertaConfig => ({
    id: Date.now().toString(),
    activa: true,
    tipo: 'ventas',
    umbral: 1000,
    condicion: 'menor',
    frecuencia: 'diaria',
    canales: ['email'],
    destinatarios: [''],
    mensaje: 'Alerta automática del sistema'
  });

  const agregarAlerta = () => {
    const nuevaAlerta = crearNuevaAlerta();
    setAlertas([...alertas, nuevaAlerta]);
    setEditando(nuevaAlerta.id);
  };

  const eliminarAlerta = (id: string) => {
    setAlertas(alertas.filter(a => a.id !== id));
    if (editando === id) {
      setEditando(null);
    }
  };

  const actualizarAlerta = (id: string, cambios: Partial<AlertaConfig>) => {
    setAlertas(alertas.map(alerta => 
      alerta.id === id ? { ...alerta, ...cambios } : alerta
    ));
  };

  const toggleActivarAlerta = (id: string) => {
    actualizarAlerta(id, { activa: !alertas.find(a => a.id === id)?.activa });
  };

  const handleGuardar = () => {
    onGuardar(alertas);
    onCerrar();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Configuración de Alertas
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Configura alertas automáticas para monitorear tu negocio
            </p>
          </div>
          <button
            onClick={onCerrar}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex h-[calc(90vh-140px)]">
          {/* Lista de alertas */}
          <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 dark:text-white">
                Alertas Activas ({alertas.filter(a => a.activa).length})
              </h3>
              <button
                onClick={agregarAlerta}
                className="flex items-center px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                Nueva
              </button>
            </div>

            <div className="space-y-2">
              {alertas.map((alerta) => {
                const tipoInfo = tiposAlerta.find(t => t.value === alerta.tipo);
                return (
                  <div
                    key={alerta.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      editando === alerta.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setEditando(alerta.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {tipoInfo?.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          alerta.activa ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            eliminarAlerta(alerta.id);
                          }}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {alerta.condicion} {alerta.umbral} • {alerta.frecuencia}
                    </p>
                  </div>
                );
              })}

              {alertas.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay alertas configuradas</p>
                </div>
              )}
            </div>
          </div>

          {/* Editor de alerta */}
          <div className="flex-1 p-6 overflow-y-auto">
            {editando ? (
              <EditarAlerta
                alerta={alertas.find(a => a.id === editando)!}
                tiposAlerta={tiposAlerta}
                canalesDisponibles={canalesDisponibles}
                onActualizar={(cambios) => actualizarAlerta(editando, cambios)}
                onToggleActiva={() => toggleActivarAlerta(editando)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Selecciona una alerta para editarla</p>
                  <p className="text-sm mt-2">O crea una nueva alerta</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {alertas.filter(a => a.activa).length} de {alertas.length} alertas activas
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCerrar}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              className="flex items-center px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente para editar una alerta específica
const EditarAlerta: React.FC<{
  alerta: AlertaConfig;
  tiposAlerta: Array<{ value: string; label: string; descripcion: string }>;
  canalesDisponibles: Array<{ value: string; label: string; icono: React.ComponentType<LucideProps> }>;
  onActualizar: (cambios: Partial<AlertaConfig>) => void;
  onToggleActiva: () => void;
}> = ({ alerta, tiposAlerta, canalesDisponibles, onActualizar, onToggleActiva }) => {
  
  const agregarDestinatario = () => {
    onActualizar({
      destinatarios: [...alerta.destinatarios, '']
    });
  };

  const actualizarDestinatario = (index: number, valor: string) => {
    const nuevosDestinatarios = [...alerta.destinatarios];
    nuevosDestinatarios[index] = valor;
    onActualizar({ destinatarios: nuevosDestinatarios });
  };

  const eliminarDestinatario = (index: number) => {
    onActualizar({
      destinatarios: alerta.destinatarios.filter((_, i) => i !== index)
    });
  };

  const toggleCanal = (canal: 'email' | 'sms' | 'notificacion') => {
    const nuevosCanales = alerta.canales.includes(canal)
      ? alerta.canales.filter(c => c !== canal)
      : [...alerta.canales, canal];
    onActualizar({ canales: nuevosCanales });
  };

  return (
    <div className="space-y-6">
      {/* Estado de la alerta */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Configurar Alerta
        </h3>
        <button
          onClick={onToggleActiva}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            alerta.activa ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              alerta.activa ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Tipo de alerta */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Tipo de Alerta
        </label>
        <select
          value={alerta.tipo}
          onChange={(e) => onActualizar({ tipo: e.target.value as 'ventas' | 'mora' | 'clientes' | 'inventario' })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {tiposAlerta.map(tipo => (
            <option key={tipo.value} value={tipo.value}>
              {tipo.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {tiposAlerta.find(t => t.value === alerta.tipo)?.descripcion}
        </p>
      </div>

      {/* Condición y umbral */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Condición
          </label>
          <select
            value={alerta.condicion}
            onChange={(e) => onActualizar({ condicion: e.target.value as 'mayor' | 'menor' | 'igual' })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="mayor">Mayor que</option>
            <option value="menor">Menor que</option>
            <option value="igual">Igual a</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Valor Umbral
          </label>
          <input
            type="number"
            value={alerta.umbral}
            onChange={(e) => onActualizar({ umbral: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Frecuencia */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Frecuencia de Verificación
        </label>
        <select
          value={alerta.frecuencia}
          onChange={(e) => onActualizar({ frecuencia: e.target.value as 'inmediata' | 'diaria' | 'semanal' })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="inmediata">Inmediata</option>
          <option value="diaria">Diaria</option>
          <option value="semanal">Semanal</option>
        </select>
      </div>

      {/* Canales de notificación */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Canales de Notificación
        </label>
        <div className="grid grid-cols-3 gap-3">
          {canalesDisponibles.map(canal => (
            <button
              key={canal.value}
              onClick={() => toggleCanal(canal.value as 'email' | 'sms' | 'notificacion')}
              className={`flex items-center justify-center p-3 rounded-lg border transition-colors ${
                alerta.canales.includes(canal.value as 'email' | 'sms' | 'notificacion')
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <canal.icono className="w-4 h-4 mr-2" />
              <span className="text-sm">{canal.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Destinatarios */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Destinatarios
          </label>
          <button
            onClick={agregarDestinatario}
            className="flex items-center px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
          >
            <Plus className="w-3 h-3 mr-1" />
            Agregar
          </button>
        </div>
        <div className="space-y-2">
          {alerta.destinatarios.map((destinatario, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="email"
                value={destinatario}
                onChange={(e) => actualizarDestinatario(index, e.target.value)}
                placeholder="email@ejemplo.com"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={() => eliminarDestinatario(index)}
                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Mensaje personalizado */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Mensaje Personalizado
        </label>
        <textarea
          value={alerta.mensaje}
          onChange={(e) => onActualizar({ mensaje: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Mensaje que se enviará cuando se active la alerta..."
        />
      </div>
    </div>
  );
}; 