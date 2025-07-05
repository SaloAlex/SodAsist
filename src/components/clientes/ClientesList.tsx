import React, { useState, useEffect } from 'react';
import { DataTable } from '../common/DataTable';
import { Cliente } from '../../types';
import { FirebaseService } from '../../services/firebaseService';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Phone, MapPin, Clock, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

export const ClientesList: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    try {
      const data = await FirebaseService.getCollection<Cliente>('clientes');
      setClientes(data);
    } catch (error) {
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'nombre' as keyof Cliente,
      label: 'Nombre',
      sortable: true,
    },
    {
      key: 'direccion' as keyof Cliente,
      label: 'Dirección',
      sortable: true,
      render: (value: string, row: Cliente) => (
        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span className="truncate max-w-xs">{value}</span>
        </div>
      ),
    },
    {
      key: 'telefono' as keyof Cliente,
      label: 'Teléfono',
      render: (value: string) => (
        <div className="flex items-center space-x-2">
          <Phone className="h-4 w-4 text-gray-400" />
          <span>{value}</span>
        </div>
      ),
    },
    {
      key: 'frecuenciaVisita' as keyof Cliente,
      label: 'Frecuencia',
      render: (value: string) => (
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="capitalize">{value}</span>
        </div>
      ),
    },
    {
      key: 'saldoPendiente' as keyof Cliente,
      label: 'Saldo Pendiente',
      sortable: true,
      render: (value: number) => (
        <div className="flex items-center space-x-2">
          <DollarSign className="h-4 w-4 text-gray-400" />
          <span className={`font-medium ${value > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ${value?.toFixed(2) || '0.00'}
          </span>
        </div>
      ),
    },
    {
      key: 'createdAt' as keyof Cliente,
      label: 'Fecha Alta',
      sortable: true,
      render: (value: Date) => (
        <span className="text-sm text-gray-500">
          {format(new Date(value), 'dd/MM/yyyy', { locale: es })}
        </span>
      ),
    },
  ];

  const handleRowClick = (cliente: Cliente) => {
    navigate(`/clientes/${cliente.id}`);
  };

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
          onClick={() => navigate('/clientes/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Nuevo Cliente
        </button>
      </div>

      <DataTable
        data={clientes}
        columns={columns}
        onRowClick={handleRowClick}
        searchPlaceholder="Buscar clientes..."
      />
    </div>
  );
};