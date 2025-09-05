import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, Package } from 'lucide-react';
import { TipoMovimiento, ResultadoTransaccion } from '../../types';

interface TransaccionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  producto: {
    id: string;
    nombre: string;
    stock: number;
    stockMinimo: number;
    stockMaximo?: number;
  };
  movimiento: {
    tipo: TipoMovimiento;
    cantidad: number;
    motivo: string;
  };
  resultado?: ResultadoTransaccion;
  isLoading?: boolean;
}

export const TransaccionModal: React.FC<TransaccionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  producto,
  movimiento,
  resultado,
  isLoading = false
}) => {
  const [mostrarDetalles, setMostrarDetalles] = useState(false);

  if (!isOpen) return null;

  const calcularStockResultante = () => {
    const { stock } = producto;
    const { tipo, cantidad } = movimiento;
    
    let stockResultante = stock;
    switch (tipo) {
      case TipoMovimiento.ENTRADA:
      case TipoMovimiento.DEVOLUCION:
        stockResultante = stock + cantidad;
        break;
      case TipoMovimiento.SALIDA:
      case TipoMovimiento.VENTA:
      case TipoMovimiento.MERMA:
        stockResultante = Math.max(0, stock - cantidad);
        break;
      case TipoMovimiento.AJUSTE:
        stockResultante = cantidad;
        break;
      case TipoMovimiento.TRANSFERENCIA:
        stockResultante = Math.max(0, stock + cantidad);
        break;
    }
    
    return stockResultante;
  };

  const stockResultante = calcularStockResultante();
  const stockBajo = stockResultante <= producto.stockMinimo;
  const stockExcedido = producto.stockMaximo && stockResultante > producto.stockMaximo;

  const getTipoMovimientoTexto = (tipo: TipoMovimiento) => {
    const tipos = {
      [TipoMovimiento.ENTRADA]: 'Entrada',
      [TipoMovimiento.SALIDA]: 'Salida',
      [TipoMovimiento.VENTA]: 'Venta',
      [TipoMovimiento.AJUSTE]: 'Ajuste',
      [TipoMovimiento.DEVOLUCION]: 'Devolución',
      [TipoMovimiento.MERMA]: 'Merma',
      [TipoMovimiento.TRANSFERENCIA]: 'Transferencia',
      [TipoMovimiento.INICIAL]: 'Stock Inicial'
    };
    return tipos[tipo] || tipo;
  };

  const getIconoTipo = (tipo: TipoMovimiento) => {
    switch (tipo) {
      case TipoMovimiento.ENTRADA:
      case TipoMovimiento.DEVOLUCION:
        return '📥';
      case TipoMovimiento.SALIDA:
      case TipoMovimiento.VENTA:
      case TipoMovimiento.MERMA:
        return '📤';
      case TipoMovimiento.AJUSTE:
        return '⚖️';
      case TipoMovimiento.TRANSFERENCIA:
        return '🔄';
      default:
        return '📦';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-3">
            <Package className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Confirmar Movimiento de Stock
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {/* Información del producto */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Producto</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Nombre:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{producto.nombre}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Stock actual:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{producto.stock}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Stock mínimo:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{producto.stockMinimo}</span>
              </div>
              {producto.stockMaximo && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Stock máximo:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">{producto.stockMaximo}</span>
                </div>
              )}
            </div>
          </div>

          {/* Información del movimiento */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Movimiento</h3>
            <div className="flex items-center space-x-4">
              <div className="text-2xl">{getIconoTipo(movimiento.tipo)}</div>
              <div className="flex-1">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {getTipoMovimientoTexto(movimiento.tipo)}
                </div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  Cantidad: {movimiento.cantidad}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Motivo: {movimiento.motivo}
                </div>
              </div>
            </div>
          </div>

          {/* Resultado del stock */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Resultado</h3>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Stock actual: <span className="font-medium">{producto.stock}</span>
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                → {stockResultante}
              </div>
            </div>
            
            {/* Alertas */}
            {stockBajo && (
              <div className="mt-3 flex items-center space-x-2 text-orange-600 dark:text-orange-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">El stock resultante estará por debajo del mínimo</span>
              </div>
            )}
            
            {stockExcedido && (
              <div className="mt-3 flex items-center space-x-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">El stock excederá el máximo permitido</span>
              </div>
            )}
          </div>

          {/* Errores de validación */}
          {resultado && !resultado.exito && resultado.errores && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <h3 className="font-semibold text-red-800 dark:text-red-200">Errores de Validación</h3>
              </div>
              <ul className="space-y-2">
                {resultado.errores.map((error, index) => (
                  <li key={index} className="text-sm text-red-700 dark:text-red-300 flex items-start space-x-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Resultado exitoso */}
          {resultado && resultado.exito && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h3 className="font-semibold text-green-800 dark:text-green-200">Movimiento Exitoso</h3>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">{resultado.mensaje}</p>
            </div>
          )}

          {/* Detalles técnicos */}
          <div>
            <button
              onClick={() => setMostrarDetalles(!mostrarDetalles)}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
            >
              <Info className="h-4 w-4" />
              <span>{mostrarDetalles ? 'Ocultar' : 'Mostrar'} detalles técnicos</span>
            </button>
            
            {mostrarDetalles && (
              <div className="mt-3 bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-xs text-gray-600 dark:text-gray-400">
                <div>Producto ID: {producto.id}</div>
                <div>Tipo de movimiento: {movimiento.tipo}</div>
                <div>Stock anterior: {producto.stock}</div>
                <div>Stock resultante: {stockResultante}</div>
                {resultado && (
                  <>
                    <div>Movimiento ID: {resultado.movimientoId || 'N/A'}</div>
                    <div>Estado: {resultado.exito ? 'Exitoso' : 'Fallido'}</div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-4 p-6 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            disabled={isLoading}
          >
            {resultado ? 'Cerrar' : 'Cancelar'}
          </button>
          
          {!resultado && (
            <button
              onClick={onConfirm}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Confirmar Movimiento</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
