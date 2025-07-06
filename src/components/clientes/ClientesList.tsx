import React, { useState, useEffect, useMemo } from 'react';
import { DataTable } from '../common/DataTable';
import { Cliente } from '../../types';
import { FirebaseService } from '../../services/firebaseService';
import { useNavigate } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Phone, MapPin, Clock, Plus, Package, Beer, Check, X,
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
      if (filters.mostrarDeudores && cliente.saldoPendiente <= 0) {
        return false;
      }

      // 5. Filtro de entregas recientes (últimos 7 días)
      if (filters.mostrarEntregasRecientes) {
        if (!cliente.ultimaEntregaFecha) {
          return false;
        }
        const fechaLimite = subDays(new Date(), 7);
        if (new Date(cliente.ultimaEntregaFecha) < fechaLimite) {
          return false;
        }
      }

      return true;
    });
  }, [clientes, filters]);

  const handleDeleteCliente = async (cliente: Cliente) => {
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
    window.open(`tel:${cliente.telefono}`, '_blank');
  };

  const handleWhatsApp = (cliente: Cliente) => {
    const mensaje = encodeURIComponent('Hola, te contacto desde SodAsist');
    window.open(`https://wa.me/${cliente.telefono}?text=${mensaje}`, '_blank');
  };

  const handleVerHistorial = (cliente: Cliente) => {
    navigate(`/clientes/${cliente.id}/historial`);
  };

  const handleVerObservaciones = async (cliente: Cliente) => {
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
      icon: <Edit className="h-5 w-5 text-blue-600" />,
      onClick: (cliente: Cliente) => navigate(`/clientes/${cliente.id}`),
      tooltip: 'Editar datos del cliente',
    },
    {
      label: 'Nueva Entrega',
      icon: <Box className="h-5 w-5 text-green-600" />,
      onClick: (cliente: Cliente) => navigate(`/entregas/nuevo?clienteId=${cliente.id}`),
      tooltip: 'Registrar nueva entrega',
    },
    {
      label: 'Ver Historial',
      icon: <History className="h-5 w-5 text-purple-600" />,
      onClick: handleVerHistorial,
      tooltip: 'Ver historial de entregas',
    },
    {
      label: 'Llamar',
      icon: <PhoneCall className="h-5 w-5 text-green-600" />,
      onClick: handleLlamar,
      show: () => 'ontouchstart' in window,
      tooltip: 'Llamar al cliente',
    },
    {
      label: 'WhatsApp',
      icon: <MessageSquare className="h-5 w-5 text-green-600" />,
      onClick: handleWhatsApp,
      tooltip: 'Enviar mensaje por WhatsApp',
    },
    {
      label: 'Eliminar',
      icon: <Trash2 className="h-5 w-5 text-red-600" />,
      onClick: handleDeleteCliente,
      className: 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10',
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
      render: (value: unknown, row: Cliente) => (
        <div className="flex items-center space-x-2">
          <span>{String(value)}</span>
          <button
            onClick={() => handleVerObservaciones(row)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            title="Ver observaciones"
          >
            <FileText className="h-5 w-5 text-blue-500" />
          </button>
          {row.saldoPendiente > 0 && (
            <div className="group relative inline-block">
              <AlertCircle 
                className="h-5 w-5 text-red-500 cursor-help hover:text-red-600" 
              />
              <div className="hidden group-hover:block absolute z-[1000] w-48 p-3 bg-red-600 text-white text-sm rounded-lg shadow-lg -translate-x-1/2 left-1/2 mt-2">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 border-8 border-transparent border-b-red-600"></div>
                <div>Saldo pendiente:</div>
                <div className="font-semibold">
                  {new Intl.NumberFormat('es-AR', {
                    style: 'currency',
                    currency: 'ARS'
                  }).format(row.saldoPendiente)}
                </div>
              </div>
            </div>
          )}
        </div>
      ),
    },

    /* 2 ─ Día de visita */
    {
      key: 'diaVisita' as keyof Cliente,
      label: 'Día',
      width: '8%',
      render: (value: unknown) => (
        <div className="flex items-center space-x-1">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="capitalize">{String(value)}</span>
        </div>
      ),
    },

    /* 3 ─ Dirección */
    {
      key: 'direccion' as keyof Cliente,
      label: 'Dirección',
      width: '30%',
      render: (value: unknown) => (
        <div className="flex items-center space-x-1">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span className="truncate max-w-[250px]">{String(value)}</span>
        </div>
      ),
    },

    /* 4 ─ Teléfono */
    {
      key: 'telefono' as keyof Cliente,
      label: 'Teléfono',
      width: '12%',
      render: (value: unknown) => (
        <div className="flex items-center space-x-1">
          <Phone className="h-4 w-4 text-gray-400" />
          <span>{String(value)}</span>
        </div>
      ),
    },

    /* 5 ─ Bidones 10 L */
    {
      key: 'bidones10' as keyof Cliente,
      label: '10 L',
      render: (value: unknown) => (
        <div className="flex items-center space-x-1">
          <Package className="h-4 w-4 text-gray-400" />
          <span>{Number(value) || 0}</span>
        </div>
      ),
    },

    /* 6 ─ Bidones 20 L */
    {
      key: 'bidones20' as keyof Cliente,
      label: '20 L',
      render: (value: unknown) => (
        <div className="flex items-center space-x-1">
          <Package className="h-4 w-4 text-gray-400" />
          <span>{Number(value) || 0}</span>
        </div>
      ),
    },

    /* 7 ─ Sodas */
    {
      key: 'sodas' as keyof Cliente,
      label: 'Sodas',
      render: (value: unknown) => (
        <div className="flex items-center space-x-1">
          <Beer className="h-4 w-4 text-gray-400" />
          <span>{Number(value) || 0}</span>
        </div>
      ),
    },

    /* 8 ─ Envases devueltos */
    {
      key: 'envasesDevueltos' as keyof Cliente,
      label: 'Env.',
      render: (value: unknown) => <span>{Number(value) || 0}</span>,
    },

    /* 9 ─ Pagado */
    {
      key: 'pagado' as keyof Cliente,
      label: 'Pagado',
      render: (value: unknown) =>
        value ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <X className="h-4 w-4 text-red-600" />
        ),
    },

    /* 10 ─ Total último servicio */
    {
      key: 'total' as keyof Cliente,
      label: 'Total $',
      sortable: true,
      render: (value: unknown) =>
        new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
        }).format(Number(value) || 0),
    },

    /* 11 ─ Saldo pendiente */
    {
      key: 'saldoPendiente' as keyof Cliente,
      label: 'Saldo',
      sortable: true,
      width: '15%',
      render: (value: unknown) => {
        const saldo = Number(value) || 0;
        return (
          <span className={`font-medium ${saldo > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {new Intl.NumberFormat('es-AR', {
              style: 'currency',
              currency: 'ARS',
            }).format(saldo)}
          </span>
        );
      },
    },

    /* 12 ─ Última entrega */
    {
      key: 'ultimaEntregaFecha' as keyof Cliente,
      label: 'Últ. Entrega',
      sortable: true,
      width: '10%',
      render: (value: unknown) => {
        if (!value) return '—';
        return format(new Date(value as Date), 'dd/MM/yy', { locale: es });
      },
    },
  ];

  const ObservacionesModal = () => {
    if (!observacionesModalOpen || !observacionesCliente) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 relative">
          <button
            onClick={() => setObservacionesModalOpen(false)}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-center mb-4">
            <FileText className="h-5 w-5 text-blue-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Observaciones de {observacionesCliente.nombre}
            </h3>
          </div>
          
          <div className="mt-4 text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
            {observacionesCliente.observaciones}
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setObservacionesModalOpen(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Clientes
        </h1>
        <button
          onClick={() => navigate('/clientes/nuevo')}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nuevo Cliente
        </button>
      </div>

      <ClientesFilters
        filters={filters}
        onFiltersChange={setFilters}
      />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <DataTable
          data={clientesFiltrados}
          columns={columns}
          actions={actions}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100]
          }}
          emptyMessage="No se encontraron clientes que coincidan con los filtros"
        />
      </div>

      <ObservacionesModal />
    </div>
  );
};