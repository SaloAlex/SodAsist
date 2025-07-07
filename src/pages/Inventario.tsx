import React, { useReducer, useCallback, useEffect, memo } from 'react';
import { Package, Plus, Minus, RotateCcw, Clock, AlertTriangle, FileText } from 'lucide-react';
import { InventarioVehiculo } from '../types';
import { FirebaseService } from '../services/firebaseService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { collection, doc, runTransaction, serverTimestamp, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

const INVENTARIO_INICIAL = {
  sodas: 100,
  bidones10: 50,
  bidones20: 30,
  envasesDevueltos: 0
};

const NIVELES_CRITICOS = {
  sodas: 20,
  bidones10: 10,
  bidones20: 5,
  envasesDevueltos: 0
};

type InventarioAction =
  | { type: 'SET_DOC'; payload: InventarioVehiculo }
  | { type: 'ADJUST'; field: keyof InventarioVehiculo; delta: number }
  | { type: 'SET'; field: keyof InventarioVehiculo; value: number }
  | { type: 'RESET' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_EDITING'; payload: keyof InventarioVehiculo | null };

interface InventarioState {
  data: InventarioVehiculo;
  loading: boolean;
  saving: boolean;
  editingField: keyof InventarioVehiculo | null;
}

function inventarioReducer(state: InventarioState, action: InventarioAction): InventarioState {
  switch (action.type) {
    case 'SET_DOC':
      return { ...state, data: action.payload };
    case 'ADJUST': {
      const currentValue = state.data[action.field] as number;
      const newValue = Math.max(0, currentValue + action.delta);
      return {
        ...state,
        data: { ...state.data, [action.field]: newValue, updatedAt: new Date() }
      };
    }
    case 'SET':
      return {
        ...state,
        data: { ...state.data, [action.field]: action.value, updatedAt: new Date() }
      };
    case 'RESET':
      return {
        ...state,
        data: { ...state.data, ...INVENTARIO_INICIAL, updatedAt: new Date() }
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_SAVING':
      return { ...state, saving: action.payload };
    case 'SET_EDITING':
      return { ...state, editingField: action.payload };
    default:
      return state;
  }
}

interface StockItemProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  onIncrease: () => void;
  onDecrease: () => void;
  onManualUpdate: (value: number) => void;
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  nivelCritico: number;
  disabled: boolean;
}

const StockItem = memo<StockItemProps>(({
  title,
  value,
  icon,
  onIncrease,
  onDecrease,
  onManualUpdate,
  isEditing,
  setIsEditing,
  nivelCritico,
  disabled
}) => {
  const [manualValue, setManualValue] = React.useState(value.toString());
  const isBajoStock = value <= nivelCritico;

  useEffect(() => {
    setManualValue(value.toString());
  }, [value]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newValue = Number(manualValue);
    if (!isNaN(newValue) && newValue >= 0) {
      onManualUpdate(newValue);
      setIsEditing(false);
    }
  };

  return (
    <div className={clsx(
      'bg-white dark:bg-gray-800 rounded-lg shadow p-6',
      { 'bg-amber-50 dark:bg-amber-900/20': isBajoStock }
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {icon}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          {isBajoStock && (
            <div className="flex items-center" title="Stock bajo" role="alert">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
          )}
        </div>
        {isEditing ? (
          <form onSubmit={handleManualSubmit} className="flex items-center space-x-2">
            <input
              type="number"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              className="w-20 px-2 py-1 text-xl font-bold border rounded"
              min="0"
              autoFocus
              aria-label={`Editar cantidad de ${title}`}
            />
            <button
              type="submit"
              className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              aria-label="Confirmar cambio"
            >
              ✓
            </button>
          </form>
        ) : (
          <div
            className={clsx(
              'text-2xl font-bold cursor-pointer',
              isBajoStock ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'
            )}
            onClick={() => setIsEditing(true)}
            title="Click para editar"
            role="button"
            tabIndex={0}
          >
            {value}
          </div>
        )}
      </div>
      <div className="flex space-x-2">
        <button
          onClick={onDecrease}
          className="flex-1 p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
          disabled={disabled}
          aria-label={`Disminuir ${title}`}
        >
          <Minus className="h-5 w-5 mx-auto" />
        </button>
        <button
          onClick={onIncrease}
          className="flex-1 p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
          disabled={disabled}
          aria-label={`Aumentar ${title}`}
        >
          <Plus className="h-5 w-5 mx-auto" />
        </button>
      </div>
    </div>
  );
});

StockItem.displayName = 'StockItem';

export const Inventario: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(inventarioReducer, {
    data: {
      id: '',
      fecha: new Date(),
      sodas: 0,
      bidones10: 0,
      bidones20: 0,
      envasesDevueltos: 0,
      updatedAt: new Date(),
    },
    loading: true,
    saving: false,
    editingField: null
  });

  const { data: inventario, loading, saving, editingField } = state;
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const unsubscribe = FirebaseService.subscribeToCollection<InventarioVehiculo>(
      'inventarioVehiculo',
      async (docs) => {
        if (docs.length > 0) {
          const latestDoc = docs.reduce((latest, current) => 
            current.fecha > latest.fecha ? current : latest
          );
          dispatch({ type: 'SET_DOC', payload: latestDoc });
        } else {
          const newInventario: InventarioVehiculo = {
            id: doc(collection(db, 'inventarioVehiculo')).id,
            fecha: new Date(),
            ...INVENTARIO_INICIAL,
            updatedAt: new Date()
          };
          dispatch({ type: 'SET_DOC', payload: newInventario });
          try {
            await runTransaction(db, async (transaction) => {
              transaction.set(doc(db, 'inventarioVehiculo', newInventario.id), {
                ...newInventario,
                updatedAt: serverTimestamp()
              });
            });
          } catch (error) {
            console.error('Error al crear inventario inicial:', error);
            toast.error('Error al crear inventario inicial', { 
              ariaProps: { role: 'alert', 'aria-live': 'assertive' }
            });
          }
        }
        dispatch({ type: 'SET_LOADING', payload: false });
      },
      (error) => {
        console.error('Error en suscripción:', error);
        if (error instanceof Error && error.message.includes('permission')) {
          toast.error('No tienes permisos para acceder al inventario', { 
            ariaProps: { role: 'alert', 'aria-live': 'assertive' }
          });
          navigate('/dashboard');
        } else {
          toast.error('Error al cargar inventario', { 
            ariaProps: { role: 'alert', 'aria-live': 'assertive' }
          });
        }
        dispatch({ type: 'SET_LOADING', payload: false });
      },
      [
        where('fecha', '>=', Timestamp.fromDate(today)),
        orderBy('fecha', 'desc'),
        limit(1)
      ]
    );

    return () => unsubscribe();
  }, [user, navigate]);

  const updateInventario = useCallback(async (
    field: keyof InventarioVehiculo,
    value: number
  ) => {
    if (!user) return;

    dispatch({ type: 'SET_SAVING', payload: true });
    const previousValue = inventario[field];

    try {
      await runTransaction(db, async (transaction) => {
        const docRef = doc(db, 'inventarioVehiculo', inventario.id);
        transaction.update(docRef, {
          [field]: value,
          updatedAt: serverTimestamp()
        });
      });

      dispatch({ type: field === 'reset' as keyof InventarioVehiculo ? 'RESET' : 'SET', field, value });
      
      const prevValue = previousValue as number;
      toast.custom(
        (t) => (
          <div className="bg-green-100 text-green-800 p-4 rounded-lg shadow flex justify-between items-center">
            <span>Inventario actualizado</span>
            <button
              onClick={() => {
                updateInventario(field, prevValue);
                toast.dismiss(t.id);
              }}
              className="text-green-600 hover:text-green-800 font-medium"
            >
              Deshacer
            </button>
          </div>
        ),
        { duration: 3000 }
      );
    } catch (error) {
      console.error('Error al actualizar inventario:', error);
      toast.error('Error al actualizar inventario', { 
        ariaProps: { role: 'alert', 'aria-live': 'assertive' }
      });
      // Revertir cambio local
      dispatch({ type: 'SET', field, value: previousValue as number });
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  }, [dispatch, inventario, user]);

  const adjustStock = useCallback((field: keyof InventarioVehiculo, delta: number) => {
    const currentValue = inventario[field] as number;
    const newValue = Math.max(0, currentValue + delta);
    updateInventario(field, newValue);
  }, [inventario, updateInventario]);

  const handleManualUpdate = useCallback((field: keyof InventarioVehiculo, value: number) => {
    updateInventario(field, value);
  }, [updateInventario]);

  const resetInventario = useCallback(async () => {
    if (!user) return;

    dispatch({ type: 'SET_SAVING', payload: true });
    const previousState = { ...inventario };

    try {
      await runTransaction(db, async (transaction) => {
        const docRef = doc(db, 'inventarioVehiculo', inventario.id);
        transaction.update(docRef, {
          ...INVENTARIO_INICIAL,
          updatedAt: serverTimestamp()
        });
      });

      dispatch({ type: 'RESET' });
      toast.custom(
        (t) => (
          <div className="bg-green-100 text-green-800 p-4 rounded-lg shadow flex justify-between items-center">
            <span>Inventario restablecido</span>
            <button
              onClick={async () => {
                dispatch({ type: 'SET_DOC', payload: previousState });
                await runTransaction(db, async (transaction) => {
                  const docRef = doc(db, 'inventarioVehiculo', inventario.id);
                  transaction.update(docRef, {
                    ...previousState,
                    updatedAt: serverTimestamp()
                  });
                });
                toast.dismiss(t.id);
              }}
              className="text-green-600 hover:text-green-800 font-medium"
            >
              Deshacer
            </button>
          </div>
        ),
        { duration: 5000 }
      );
    } catch (error) {
      console.error('Error al restablecer inventario:', error);
      toast.error('Error al restablecer inventario', { 
        ariaProps: { role: 'alert', 'aria-live': 'assertive' }
      });
      dispatch({ type: 'SET_DOC', payload: previousState });
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
      setShowResetConfirm(false);
    }
  }, [dispatch, inventario, user]);

  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6" id="print-section">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Inventario del Vehículo
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
            <Clock className="h-4 w-4 mr-1" />
            Última actualización: {formatDate(inventario.updatedAt)}
          </p>
        </div>
        <div className="flex items-center space-x-4 no-print">
          {saving && <LoadingSpinner size="sm" />}
          <button
            onClick={() => window.print()}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            title="Imprimir inventario"
            aria-label="Imprimir inventario"
          >
            <FileText className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StockItem
          title="Sodas"
          value={inventario.sodas}
          icon={<Package className="h-6 w-6 text-blue-600" />}
          onIncrease={() => adjustStock('sodas', 1)}
          onDecrease={() => adjustStock('sodas', -1)}
          onManualUpdate={(value) => handleManualUpdate('sodas', value)}
          isEditing={editingField === 'sodas'}
          setIsEditing={(value) => dispatch({ type: 'SET_EDITING', payload: value ? 'sodas' : null })}
          nivelCritico={NIVELES_CRITICOS.sodas}
          disabled={saving}
        />

        <StockItem
          title="Bidones 10L"
          value={inventario.bidones10}
          icon={<Package className="h-6 w-6 text-green-600" />}
          onIncrease={() => adjustStock('bidones10', 1)}
          onDecrease={() => adjustStock('bidones10', -1)}
          onManualUpdate={(value) => handleManualUpdate('bidones10', value)}
          isEditing={editingField === 'bidones10'}
          setIsEditing={(value) => dispatch({ type: 'SET_EDITING', payload: value ? 'bidones10' : null })}
          nivelCritico={NIVELES_CRITICOS.bidones10}
          disabled={saving}
        />

        <StockItem
          title="Bidones 20L"
          value={inventario.bidones20}
          icon={<Package className="h-6 w-6 text-purple-600" />}
          onIncrease={() => adjustStock('bidones20', 1)}
          onDecrease={() => adjustStock('bidones20', -1)}
          onManualUpdate={(value) => handleManualUpdate('bidones20', value)}
          isEditing={editingField === 'bidones20'}
          setIsEditing={(value) => dispatch({ type: 'SET_EDITING', payload: value ? 'bidones20' : null })}
          nivelCritico={NIVELES_CRITICOS.bidones20}
          disabled={saving}
        />

        <StockItem
          title="Envases Devueltos"
          value={inventario.envasesDevueltos}
          icon={<Package className="h-6 w-6 text-yellow-600" />}
          onIncrease={() => adjustStock('envasesDevueltos', 1)}
          onDecrease={() => adjustStock('envasesDevueltos', -1)}
          onManualUpdate={(value) => handleManualUpdate('envasesDevueltos', value)}
          isEditing={editingField === 'envasesDevueltos'}
          setIsEditing={(value) => dispatch({ type: 'SET_EDITING', payload: value ? 'envasesDevueltos' : null })}
          nivelCritico={NIVELES_CRITICOS.envasesDevueltos}
          disabled={saving}
        />
      </div>

      <div className="flex justify-end space-x-4 no-print">
        {showResetConfirm ? (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">¿Estás seguro?</span>
            <button
              onClick={resetInventario}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              disabled={saving}
            >
              Confirmar
            </button>
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={saving}
          >
            <RotateCcw className="h-5 w-5" />
            <span>Restablecer Inventario</span>
          </button>
        )}
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 2cm;
          }
          
          body {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
          }

          body * {
            visibility: hidden;
          }

          #print-section,
          #print-section * {
            visibility: visible !important;
            color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }

          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          /* Asegurar que los colores y fondos se impriman */
          .bg-white {
            background-color: white !important;
            box-shadow: none !important;
          }

          .text-gray-900 {
            color: black !important;
          }

          .text-gray-500 {
            color: #666 !important;
          }

          /* Ajustar el grid para impresión */
          .grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 1rem !important;
          }

          /* Estilos específicos para StockItem en impresión */
          #print-section .rounded-lg {
            border: 1px solid #ddd !important;
            padding: 1rem !important;
            margin-bottom: 1rem !important;
            page-break-inside: avoid !important;
          }

          /* Asegurar que los iconos sean visibles */
          svg {
            color: currentColor !important;
            fill: currentColor !important;
          }

          /* Ajustar el tamaño de fuente para mejor legibilidad */
          h1 {
            font-size: 24pt !important;
            margin-bottom: 1rem !important;
          }

          h3 {
            font-size: 14pt !important;
          }

          .text-2xl {
            font-size: 16pt !important;
          }

          /* Asegurar que los valores críticos sean visibles */
          .text-amber-500,
          .text-amber-600 {
            color: #d97706 !important;
          }
        }
      `}</style>
    </div>
  );
};