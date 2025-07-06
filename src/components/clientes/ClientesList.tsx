import React, { useState, useEffect, useMemo } from 'react';
import { DataTable } from '../common/DataTable';
import { Cliente } from '../../types';
import { FirebaseService } from '../../services/firebaseService';
import { useNavigate } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Phone, MapPin, Clock, Plus, Package, Beer, Check, X,
  Edit, Trash2, History, PhoneCall, MessageSquare, Box
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ClientesFilters } from './ClientesFilters';

export const ClientesList: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ClientesFilters>({
    searchTerm: '',
    diaVisita: '',
    frecuenciaVisita: '',
    mostrarDeudores: false,
    mostrarEntregasRecientes: false,
  });

  // Cargar clientes al montar el componente
  useEffect(() => {
    loadClientes();
  }, []);

  // Recargar clientes cuando se enfoca la ventana (para múltiples usuarios)
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 Ventana enfocada - Recargando clientes...');
      loadClientes();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadClientes = async () => {
    try {
      console.log('🔄 Cargando clientes...');
      setLoading(true);

      // 1. Cargar datos básicos de clientes
      const clientesData = await FirebaseService.getCollection<Cliente>('clientes');
      console.log('📊 Clientes cargados:', clientesData.length);
      
      // 2. Obtener las últimas entregas de todos los clientes
      const clienteIds = clientesData.map(cliente => cliente.id);
      const ultimasEntregas = await FirebaseService.getUltimasEntregasClientes(clienteIds);
      console.log('📦 Últimas entregas encontradas:', ultimasEntregas.size);
      
      // Debug: Mostrar qué clientes tienen entregas (solo en desarrollo)
      if (process.env.NODE_ENV === 'development') {
        clientesData.forEach(cliente => {
          const tieneEntrega = ultimasEntregas.has(cliente.id);
          console.log(`👤 ${cliente.nombre}: ${tieneEntrega ? '✅ Tiene entregas' : '❌ Sin entregas'}`);
        });
      }
      
      // 3. Combinar datos de clientes con datos de últimas entregas
      const clientesCompletos = clientesData.map(cliente => {
        const ultimaEntrega = ultimasEntregas.get(cliente.id);
        
        return {
          ...cliente,
          // Si existe última entrega, usar sus datos; si no, mantener los del cliente o usar 0
          bidones10: ultimaEntrega?.bidones10 ?? cliente.bidones10 ?? 0,
          bidones20: ultimaEntrega?.bidones20 ?? cliente.bidones20 ?? 0,
          sodas: ultimaEntrega?.sodas ?? cliente.sodas ?? 0,
          envasesDevueltos: ultimaEntrega?.envasesDevueltos ?? cliente.envasesDevueltos ?? 0,
          total: ultimaEntrega?.total ?? cliente.total ?? 0,
          pagado: ultimaEntrega?.pagado ?? cliente.pagado ?? false,
          ultimaEntregaFecha: ultimaEntrega?.fecha ?? null,
        };
      });
      
      setClientes(clientesCompletos);
      console.log('✅ Clientes actualizados con últimas entregas');
    } catch (error) {
      console.error('❌ Error al cargar clientes:', error);
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

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
    window.location.href = `tel:${cliente.telefono}`;
  };

  const handleWhatsApp = (cliente: Cliente) => {
    const mensaje = encodeURIComponent('Hola, te contacto desde SodAsist...');
    window.open(`https://wa.me/${cliente.telefono}?text=${mensaje}`, '_blank');
  };

  const handleNuevaEntrega = (cliente: Cliente) => {
    navigate(`/entregas/nuevo?clienteId=${cliente.id}`);
  };

  const handleVerHistorial = (cliente: Cliente) => {
    navigate(`/clientes/${cliente.id}/historial`);
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
      onClick: handleNuevaEntrega,
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
      width: '25%'
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
    </div>
  );
};