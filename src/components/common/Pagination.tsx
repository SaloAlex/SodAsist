import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  paginaActual: number;
  totalPaginas: number;
  totalElementos: number;
  limite: number;
  tieneSiguiente: boolean;
  tieneAnterior: boolean;
  onPageChange: (pagina: number) => void;
  onLimitChange?: (limite: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  paginaActual,
  totalPaginas,
  totalElementos,
  limite,
  tieneSiguiente,
  tieneAnterior,
  onPageChange,
  onLimitChange,
  className = ''
}) => {
  const opcionesLimite = [10, 20, 50, 100];
  
  // Calcular rango de elementos mostrados
  const inicio = (paginaActual - 1) * limite + 1;
  const fin = Math.min(paginaActual * limite, totalElementos);

  // Generar números de página a mostrar
  const generarNumerosPagina = () => {
    const numeros = [];
    const maxVisible = 5;
    
    if (totalPaginas <= maxVisible) {
      // Mostrar todas las páginas si son pocas
      for (let i = 1; i <= totalPaginas; i++) {
        numeros.push(i);
      }
    } else {
      // Lógica para mostrar páginas con elipsis
      const inicioRango = Math.max(1, paginaActual - 2);
      const finRango = Math.min(totalPaginas, paginaActual + 2);
      
      if (inicioRango > 1) {
        numeros.push(1);
        if (inicioRango > 2) {
          numeros.push('...');
        }
      }
      
      for (let i = inicioRango; i <= finRango; i++) {
        numeros.push(i);
      }
      
      if (finRango < totalPaginas) {
        if (finRango < totalPaginas - 1) {
          numeros.push('...');
        }
        numeros.push(totalPaginas);
      }
    }
    
    return numeros;
  };

  const numerosPagina = generarNumerosPagina();

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 ${className}`}>
      {/* Información de elementos */}
      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
        <span>
          Mostrando {inicio} - {fin} de {totalElementos} elementos
        </span>
        
        {/* Selector de límite */}
        {onLimitChange && (
          <div className="flex items-center space-x-2">
            <label className="text-sm">Mostrar:</label>
            <select
              value={limite}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
            >
              {opcionesLimite.map(opcion => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Controles de paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center space-x-1">
          {/* Primera página */}
          <button
            onClick={() => onPageChange(1)}
            disabled={!tieneAnterior}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Primera página"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>

          {/* Página anterior */}
          <button
            onClick={() => onPageChange(paginaActual - 1)}
            disabled={!tieneAnterior}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Números de página */}
          <div className="flex items-center space-x-1">
            {numerosPagina.map((numero, index) => (
              <React.Fragment key={index}>
                {numero === '...' ? (
                  <span className="px-3 py-2 text-gray-500 dark:text-gray-400">
                    ...
                  </span>
                ) : (
                  <button
                    onClick={() => onPageChange(numero as number)}
                    className={`px-3 py-2 rounded-lg border transition-colors ${
                      numero === paginaActual
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {numero}
                  </button>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Página siguiente */}
          <button
            onClick={() => onPageChange(paginaActual + 1)}
            disabled={!tieneSiguiente}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Página siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Última página */}
          <button
            onClick={() => onPageChange(totalPaginas)}
            disabled={!tieneSiguiente}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Última página"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};
