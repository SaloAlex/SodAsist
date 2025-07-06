import React from 'react';
import { Search, Filter, Calendar, Clock, DollarSign } from 'lucide-react';

export interface ClientesFilters {
  searchTerm: string;
  diaVisita: string;
  frecuenciaVisita: string;
  mostrarDeudores: boolean;
  mostrarEntregasRecientes: boolean;
}

interface ClientesFiltersProps {
  filters: ClientesFilters;
  onFiltersChange: (filters: ClientesFilters) => void;
}

export const ClientesFilters: React.FC<ClientesFiltersProps> = ({
  filters,
  onFiltersChange,
}) => {
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    onFiltersChange({
      ...filters,
      [name]: value,
    });
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    onFiltersChange({
      ...filters,
      [name]: checked,
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Búsqueda por texto */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            name="searchTerm"
            value={filters.searchTerm}
            onChange={handleInputChange}
            placeholder="Buscar por nombre, dirección..."
            className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        {/* Filtro por día de visita */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
          <select
            name="diaVisita"
            value={filters.diaVisita}
            onChange={handleInputChange}
            className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Todos los días</option>
            <option value="lunes">Lunes</option>
            <option value="martes">Martes</option>
            <option value="miércoles">Miércoles</option>
            <option value="jueves">Jueves</option>
            <option value="viernes">Viernes</option>
            <option value="sábado">Sábado</option>
            <option value="domingo">Domingo</option>
          </select>
        </div>

        {/* Filtro por frecuencia */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
          <select
            name="frecuenciaVisita"
            value={filters.frecuenciaVisita}
            onChange={handleInputChange}
            className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Todas las frecuencias</option>
            <option value="semanal">Semanal</option>
            <option value="quincenal">Quincenal</option>
            <option value="mensual">Mensual</option>
          </select>
        </div>

        {/* Checkbox para mostrar solo deudores */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="mostrarDeudores"
            name="mostrarDeudores"
            checked={filters.mostrarDeudores}
            onChange={handleCheckboxChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label
            htmlFor="mostrarDeudores"
            className="text-sm text-gray-700 dark:text-gray-300 flex items-center"
          >
            <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
            Solo deudores
          </label>
        </div>

        {/* Checkbox para mostrar entregas recientes */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="mostrarEntregasRecientes"
            name="mostrarEntregasRecientes"
            checked={filters.mostrarEntregasRecientes}
            onChange={handleCheckboxChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label
            htmlFor="mostrarEntregasRecientes"
            className="text-sm text-gray-700 dark:text-gray-300 flex items-center"
          >
            <Filter className="h-4 w-4 mr-1 text-gray-400" />
            Entregas recientes
          </label>
        </div>
      </div>
    </div>
  );
}; 