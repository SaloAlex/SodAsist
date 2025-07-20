import React from 'react';
import { Search } from 'lucide-react';

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
  className?: string;
}

export const ClientesFilters: React.FC<ClientesFiltersProps> = ({
  filters,
  onFiltersChange,
  className = ''
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
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Búsqueda por texto */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            name="searchTerm"
            value={filters.searchTerm}
            onChange={handleInputChange}
            placeholder="Buscar por nombre, dirección..."
            className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
          />
        </div>

        {/* Filtro por día de visita */}
        <div>
          <select
            name="diaVisita"
            value={filters.diaVisita}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
        <div>
          <select
            name="frecuenciaVisita"
            value={filters.frecuenciaVisita}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Todas las frecuencias</option>
            <option value="semanal">Semanal</option>
            <option value="quincenal">Quincenal</option>
            <option value="mensual">Mensual</option>
          </select>
        </div>

        {/* Filtros de checkboxes */}
        <div className="flex flex-col space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="mostrarDeudores"
              checked={filters.mostrarDeudores}
              onChange={handleCheckboxChange}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-blue-600 dark:checked:border-blue-600"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Con deuda</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              name="mostrarEntregasRecientes"
              checked={filters.mostrarEntregasRecientes}
              onChange={handleCheckboxChange}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-blue-600 dark:checked:border-blue-600"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Entregas recientes</span>
          </label>
        </div>

        {/* Botón de limpiar filtros */}
        <div>
          <button
            onClick={() => onFiltersChange({
              searchTerm: '',
              diaVisita: '',
              frecuenciaVisita: '',
              mostrarDeudores: false,
              mostrarEntregasRecientes: false,
            })}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      </div>
    </div>
  );
}; 