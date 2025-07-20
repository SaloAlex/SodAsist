import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  width?: string;
  hideOnMobile?: boolean;
  priority?: number; // 1 es la más alta prioridad (siempre visible)
}

interface Action<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  show?: (row: T) => boolean;
  className?: string;
  tooltip?: string;
}

interface PaginationOptions {
  pageSize: number;
  showSizeChanger?: boolean;
  pageSizeOptions?: number[];
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  className?: string;
  pagination?: PaginationOptions;
  emptyMessage?: string;
  virtualScroll?: boolean;
}

export const DataTable = <T,>({
  data,
  columns,
  actions,
  searchable = true,
  searchPlaceholder = 'Buscar...',
  onRowClick,
  className = '',
  pagination,
  emptyMessage = 'No se encontraron resultados'
}: DataTableProps<T>) => {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(pagination?.pageSize || 10);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState<number | null>(null);

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const filteredData = searchable
    ? data.filter(row =>
        columns.some(col =>
          String(row[col.key]).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : data;

  const sortedData = sortKey
    ? [...filteredData].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      })
    : filteredData;

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const renderCellContent = (value: unknown, column: Column<T>, row: T): React.ReactNode => {
    if (column.render) {
      return column.render(value, row);
    }
    
    if (value === null || value === undefined) {
      return '';
    }

    if (React.isValidElement(value)) {
      return value;
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  };

  const renderActions = (row: T) => {
    if (!actions?.length) return null;

    const visibleActions = actions.filter(action => !action.show || action.show(row));
    if (!visibleActions.length) return null;

    return (
      <div className="flex items-center justify-end space-x-1">
        {visibleActions.map((action, actionIndex) => (
          <button
            key={actionIndex}
            onClick={(e) => {
              e.stopPropagation();
              action.onClick(row);
            }}
            className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group relative text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white ${
              action.className || ''
            }`}
            title={action.tooltip || action.label}
          >
            <span className="sr-only">{action.label}</span>
            {action.icon}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 dark:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {action.tooltip || action.label}
            </div>
          </button>
        ))}
      </div>
    );
  };

  const renderMobileRow = (row: T, index: number) => {
    const visibleColumns = columns
      .filter(col => !col.hideOnMobile)
      .sort((a, b) => (a.priority || 99) - (b.priority || 99));

    const primaryColumn = visibleColumns[0];
    const secondaryColumns = visibleColumns.slice(1);

    return (
      <div
        key={index}
        className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-2"
        onClick={() => onRowClick?.(row)}
      >
        <div className="flex justify-between items-start">
          <div className="font-medium">
            {renderCellContent(row[primaryColumn.key], primaryColumn, row)}
          </div>
          {actions?.length ? (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsActionsMenuOpen(isActionsMenuOpen === index ? null : index);
                }}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
              {isActionsMenuOpen === index && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-50 py-1 border border-gray-200 dark:border-gray-700">
                  {actions.map((action, actionIndex) => (
                    (!action.show || action.show(row)) && (
                      <button
                        key={actionIndex}
                        onClick={(e) => {
                          e.stopPropagation();
                          action.onClick(row);
                          setIsActionsMenuOpen(null);
                        }}
                        className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 text-gray-900 dark:text-gray-100 transition-colors ${
                          action.className || ''
                        }`}
                      >
                        {action.icon}
                        <span>{action.label}</span>
                      </button>
                    )
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
        <div className="space-y-1">
          {secondaryColumns.map((column) => (
            <div key={String(column.key)} className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">{column.label}: </span>
              <span className="text-gray-900 dark:text-white">
                {renderCellContent(row[column.key], column, row)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      {searchable && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
          </div>
        </div>
      )}
      
      {/* Vista móvil */}
      <div className="lg:hidden">
        {paginatedData.map((row, index) => renderMobileRow(row, index))}
      </div>

      {/* Vista desktop */}
      <div className="hidden lg:block">
        <div className="min-w-full align-middle">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={String(column.key)}
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400"
                      style={column.width ? { width: column.width } : undefined}
                    >
                      {column.sortable ? (
                        <button
                          onClick={() => handleSort(column.key)}
                          className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          <span>{column.label}</span>
                          {sortKey === column.key && (
                            sortDirection === 'asc' ? 
                              <ChevronUp className="h-4 w-4" /> : 
                              <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  ))}
                  {actions?.length ? (
                    <th className="px-3 py-3 text-right w-[110px]">
                      Acciones
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                {paginatedData.map((row, index) => (
                  <tr
                    key={index}
                    onClick={() => onRowClick?.(row)}
                    className={`${
                      onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : ''
                    } transition-colors`}
                  >
                    {columns.map((column) => (
                      <td
                        key={String(column.key)}
                        className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                      >
                        {renderCellContent(row[column.key], column, row)}
                      </td>
                    ))}
                    {actions?.length ? (
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        {renderActions(row)}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {sortedData.length === 0 ? (
        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
          {emptyMessage}
        </div>
      ) : pagination && (
        <div className="px-3 py-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            {pagination.showSizeChanger && (
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {(pagination.pageSizeOptions || [10, 20, 30, 50]).map(size => (
                  <option key={size} value={size}>
                    {size} por página
                  </option>
                ))}
              </select>
            )}
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Mostrando {startIndex + 1} a {Math.min(startIndex + pageSize, sortedData.length)} de {sortedData.length}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:text-gray-400 dark:disabled:text-gray-600"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:text-gray-400 dark:disabled:text-gray-600"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};