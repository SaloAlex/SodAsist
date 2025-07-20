import React, { useState, useEffect, useMemo } from 'react';
import { DataTable } from '../common/DataTable';
import { Cliente } from '../../types';
import { FirebaseService } from '../../services/firebaseService';
import { useNavigate } from 'react-router-dom';
import {
  Phone, MapPin, Clock, Plus, Package, Beer,
  Edit, Trash2, History, PhoneCall, MessageSquare, Box,
  AlertCircle, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ClientesFilters } from './ClientesFilters';
import { LoadingSpinner } from '../common/LoadingSpinner';

export const ClientesList: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [observacionesModalOpen, setObservacionesModalOpen] = useState(false);
  const [observacionesCliente, setObservacionesCliente] = useState<{nombre: string, observaciones: string} | null>(null);
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ClientesFilters>({
    searchTerm: '',
    diaVisita: '',
    frecuenciaVisita: '',
    mostrarDeudores: false,
    mostrarEntregasRecientes: false,
  });

  const loadClientes = async () => {
    setLoading(true);
    try {
      const data = await FirebaseService.getCollection<Cliente>('clientes');
      setClientes(data);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      toast.error('Error al cargar los clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientes();

    // Recargar cuando la ventana recupera el foco
    const onFocus = () => loadClientes();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Filtrar clientes basado en los criterios
  const clientesFiltrados = useMemo(() => {
    // Función para normalizar texto (quitar acentos y convertir a minúsculas)
    const normalizeText = (text: string) => {
      return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    };

    // Función para calcular la similitud entre dos strings (tolerante a errores)
    const calculateSimilarity = (str1: string, str2: string) => {
      const norm1 = normalizeText(str1);
      const norm2 = normalizeText(str2);
      
      // Si uno contiene al otro, es una coincidencia
      if (norm1.includes(norm2) || norm2.includes(norm1)) {
        return true;
      }
      
      // Verificar si las palabras coinciden parcialmente
      const words1 = norm1.split(' ');
      const words2 = norm2.split(' ');
      
      return words1.some(word1 => 
        words2.some(word2 => 
          word1.length > 3 && word2.length > 3 && 
          (word1.includes(word2) || word2.includes(word1))
        )
      );
    };

    return clientes.filter(cliente => {
      // 1. Filtro por texto (nombre, dirección, teléfono)
      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        const matchNombre = calculateSimilarity(cliente.nombre, searchTerm);
        const matchDireccion = calculateSimilarity(cliente.direccion, searchTerm);
        const matchTelefono = cliente.telefono.includes(searchTerm);
        
        if (!matchNombre && !matchDireccion && !matchTelefono) {
          return false;
        }
      }

      // 2. Filtro por día de visita
      if (filters.diaVisita && cliente.diaVisita !== filters.diaVisita) {
        return false;
      }

      // 3. Filtro por frecuencia
      if (filters.frecuenciaVisita && cliente.frecuenciaVisita !== filters.frecuenciaVisita) {
        return false;
      }

      // 4. Filtro de deudores
      if (filters.mostrarDeudores) {
        const saldoPendiente = cliente.saldoPendiente ?? 0;
        if (saldoPendiente <= 0) {
          return false;
        }
      }

      // 5. Filtro de entregas recientes (últimos 7 días)
      if (filters.mostrarEntregasRecientes) {
        if (!cliente.ultimaEntregaFecha) {
          return false;
        }
        const fechaLimite = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 días atrás
        if (new Date(cliente.ultimaEntregaFecha) < fechaLimite) {
          return false;
        }
      }

      return true;
    });
  }, [clientes, filters]);

  const handleDeleteCliente = async (cliente: Cliente) => {
    if (!cliente.id) return;
    
    if (window.confirm(`¿Estás seguro de eliminar a ${cliente.nombre}?`)) {
      try {
        await FirebaseService.deleteDocument('clientes', cliente.id);
        toast.success('Cliente eliminado correctamente');
        loadClientes();
      } catch (error) {
        console.error('Error al eliminar cliente:', error);
        toast.error('Error al eliminar cliente');
      }
    }
  };

  const handleLlamar = (cliente: Cliente) => {
    if (cliente.telefono) {
      window.open(`tel:${cliente.telefono}`, '_blank');
    }
  };

  const handleWhatsApp = (cliente: Cliente) => {
    if (cliente.telefono) {
      const mensaje = encodeURIComponent('Hola, te contacto desde SodAsist');
      window.open(`https://wa.me/${cliente.telefono}?text=${mensaje}`, '_blank');
    }
  };

  const handleVerHistorial = (cliente: Cliente) => {
    if (cliente.id) {
      navigate(`${cliente.id}/historial`);
    }
  };

  const handleVerObservaciones = async (cliente: Cliente) => {
    if (!cliente.id) return;
    
    try {
      const clienteCompleto = await FirebaseService.getDocument<Cliente>('clientes', cliente.id);
      if (clienteCompleto && clienteCompleto.observaciones) {
        setObservacionesCliente({
          nombre: clienteCompleto.nombre,
          observaciones: clienteCompleto.observaciones
        });
        setObservacionesModalOpen(true);
      } else {
        toast.error('Este cliente no tiene observaciones registradas');
      }
    } catch (error) {
      console.error('Error al cargar observaciones:', error);
      toast.error('Error al cargar las observaciones');
    }
  };

  const actions = [
    {
      label: 'Editar',
      icon: <Edit className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
      onClick: (cliente: Cliente) => navigate(`${cliente.id}`),
      tooltip: 'Editar datos del cliente',
    },
    {
      label: 'Nueva Entrega',
      icon: <Box className="h-5 w-5 text-green-600 dark:text-green-400" />,
      onClick: (cliente: Cliente) => navigate(`/entregas/nuevo?clienteId=${cliente.id}`),
      tooltip: 'Registrar nueva entrega',
    },
    {
      label: 'Ver Historial',
      icon: <History className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
      onClick: handleVerHistorial,
      tooltip: 'Ver historial de entregas',
    },
    {
      label: 'Llamar',
      icon: <PhoneCall className="h-5 w-5 text-green-600 dark:text-green-400" />,
      onClick: handleLlamar,
      show: () => 'ontouchstart' in window,
      tooltip: 'Llamar al cliente',
    },
    {
      label: 'WhatsApp',
      icon: <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />,
      onClick: handleWhatsApp,
      tooltip: 'Enviar mensaje por WhatsApp',
    },
    {
      label: 'Eliminar',
      icon: <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />,
      onClick: handleDeleteCliente,
      className: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10',
      tooltip: 'Eliminar cliente',
    },
  ];

  const columns = [
    /* 1 ─ Nombre */
    { 
      key: 'nombre' as keyof Cliente, 
      label: 'Nombre', 
      sortable: true,
      width: '25%',
      priority: 1,
      render: (value: unknown, row: Cliente) => {
        const saldoPendiente = row.saldoPendiente ?? 0;
        return (
          <div className="flex items-center space-x-2">
            <span className="text-gray-900 dark:text-white">{String(value)}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleVerObservaciones(row);
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Ver observaciones"
            >
              <FileText className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            </button>
            {saldoPendiente > 0 && (
              <div className="group relative inline-block">
                <AlertCircle 
                  className="h-5 w-5 text-red-500 dark:text-red-400 cursor-help hover:text-red-600 dark:hover:text-red-300" 
                />
                <div className="hidden group-hover:block absolute z-[1000] w-48 p-3 bg-red-600 dark:bg-red-500 text-white text-sm rounded-lg shadow-lg -translate-x-1/2 left-1/2 mt-2">
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 border-8 border-transparent border-b-red-600 dark:border-b-red-500"></div>
                  <div>Saldo pendiente:</div>
                  <div className="font-semibold">
                    {new Intl.NumberFormat('es-AR', {
                      style: 'currency',
                      currency: 'ARS'
                    }).format(saldoPendiente)}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      },
    },
    /* 2 ─ Teléfono */
    { 
      key: 'telefono' as keyof Cliente, 
      label: 'Teléfono',
      width: '15%',
      priority: 2,
      render: (value: unknown) => (
        <div className="flex items-center space-x-2">
          <Phone className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          <span className="text-gray-900 dark:text-white">{String(value)}</span>
        </div>
      ),
    },
    /* 3 ─ Dirección */
    { 
      key: 'direccion' as keyof Cliente, 
      label: 'Dirección',
      width: '25%',
      priority: 3,
      render: (value: unknown) => (
        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          <span className="truncate text-gray-900 dark:text-white">{String(value)}</span>
        </div>
      ),
    },
    /* 4 ─ Día y Frecuencia */
    { 
      key: 'diaVisita' as keyof Cliente, 
      label: 'Visita',
      width: '15%',
      hideOnMobile: true,
      render: (value: unknown, row: Cliente) => (
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          <span className="text-gray-900 dark:text-white">
            {String(value).charAt(0).toUpperCase() + String(value).slice(1)}
            <span className="text-gray-400 dark:text-gray-500"> • </span>
            {row.frecuenciaVisita}
          </span>
        </div>
      ),
    },
    /* 5 ─ Consumo */
    { 
      key: 'consumoPromedio' as keyof Cliente, 
      label: 'Consumo',
      width: '20%',
      hideOnMobile: true,
      render: (_: unknown, row: Cliente) => (
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Package className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <span className="text-gray-900 dark:text-white">{row.consumoPromedioBidones || 0}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Beer className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <span className="text-gray-900 dark:text-white">{row.consumoPromedioSodas || 0}</span>
          </div>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Clientes
        </h2>
        <button
          onClick={() => navigate('new')}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-offset-gray-900"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nuevo Cliente
        </button>
      </div>

      <ClientesFilters
        filters={filters}
        onFiltersChange={setFilters}
        className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4"
      />

      <DataTable
        data={clientesFiltrados}
        columns={columns}
        actions={actions}
        searchable={true}
        searchPlaceholder="Buscar por nombre, dirección o teléfono..."
        onRowClick={(cliente: Cliente) => cliente.id && navigate(`${cliente.id}`)}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100]
        }}
        className="overflow-hidden"
      />

      {/* Modal de observaciones */}
      {observacionesModalOpen && observacionesCliente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Observaciones de {observacionesCliente.nombre}
              </h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {observacionesCliente.observaciones}
              </p>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setObservacionesModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};