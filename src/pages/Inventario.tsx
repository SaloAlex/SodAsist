import React, { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Minus, RotateCcw, Clock, AlertTriangle, FileText } from 'lucide-react';
import { InventarioVehiculo } from '../types';
import { FirebaseService } from '../services/firebaseService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { collection, doc, setDoc, serverTimestamp, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

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

const StockItem: React.FC<StockItemProps> = ({
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
  const [manualValue, setManualValue] = useState(value.toString());

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newValue = parseInt(manualValue);
    if (!isNaN(newValue) && newValue >= 0) {
      onManualUpdate(newValue);
      setIsEditing(false);
    }
  };

  const isBajoStock = value <= nivelCritico;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {icon}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          {isBajoStock && (
            <div className="flex items-center" title="Stock bajo">
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
            />
            <button
              type="submit"
              className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              ✓
            </button>
          </form>
        ) : (
          <div
            className="text-2xl font-bold text-gray-900 dark:text-white cursor-pointer"
            onClick={() => setIsEditing(true)}
            title="Click para editar"
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
        >
          <Minus className="h-5 w-5 mx-auto" />
        </button>
        <button
          onClick={onIncrease}
          className="flex-1 p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
          disabled={disabled}
        >
          <Plus className="h-5 w-5 mx-auto" />
        </button>
      </div>
    </div>
  );
};

export const Inventario: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [inventario, setInventario] = useState<InventarioVehiculo>({
    id: '',
    fecha: new Date(),
    sodas: 0,
    bidones10: 0,
    bidones20: 0,
    envasesDevueltos: 0,
    updatedAt: new Date(),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState<keyof InventarioVehiculo | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Manejar la autenticación y redirección
  useEffect(() => {
    console.log('Estado de autenticación:', user);
    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  // Función para actualizar el inventario
  const updateInventario = useCallback(async (
    field: keyof InventarioVehiculo, 
    value: number, 
    currentInventario = inventario
  ) => {
    if (!user) {
      console.error('No hay usuario autenticado');
      toast.error('No hay usuario autenticado');
      return;
    }

    setSaving(true);
    try {
      const updated = { 
        ...currentInventario,
        [field]: value,
        updatedAt: new Date()
      };
      
      await setDoc(doc(db, 'inventarioVehiculo', currentInventario.id), {
        ...updated,
        updatedAt: serverTimestamp()
      });
      setInventario(updated);
      toast.success('Inventario actualizado');
    } catch (error) {
      console.error('Error al actualizar inventario:', error);
      toast.error('Error al actualizar inventario');
      setInventario(currentInventario);
    } finally {
      setSaving(false);
    }
  }, [inventario, user]);

  // Suscripción al inventario cuando tenemos usuario
  useEffect(() => {
    if (!user) {
      console.log('No hay usuario autenticado para cargar inventario');
      return;
    }

    console.log('Iniciando suscripción a inventario...');
    setLoading(true);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const unsubscribe = FirebaseService.subscribeToCollection<InventarioVehiculo>(
      'inventarioVehiculo',
      async (docs) => {
        console.log('Datos recibidos de Firestore:', docs);
        if (docs.length > 0) {
          // Tomar el documento más reciente
          const latestDoc = docs.reduce((latest, current) => 
            current.fecha > latest.fecha ? current : latest
          );
          console.log('Documento más reciente:', latestDoc);
          setInventario(latestDoc);
        } else {
          console.log('No hay documentos, creando inventario inicial');
          // Si no hay inventario, crear uno nuevo
          const newInventario: InventarioVehiculo = {
            id: doc(collection(db, 'inventarioVehiculo')).id,
            fecha: new Date(),
            ...INVENTARIO_INICIAL,
            updatedAt: new Date()
          };
          setInventario(newInventario);
          try {
            await setDoc(doc(db, 'inventarioVehiculo', newInventario.id), {
              ...newInventario,
              updatedAt: serverTimestamp()
            });
          } catch (error) {
            console.error('Error al crear inventario inicial:', error);
            toast.error('Error al crear inventario inicial');
          }
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error en suscripción:', error);
        if (error instanceof Error && error.message.includes('permission')) {
          toast.error('No tienes permisos para acceder al inventario');
          navigate('/dashboard');
        } else {
          toast.error('Error al cargar inventario');
        }
        setLoading(false);
      },
      [
        where('fecha', '>=', Timestamp.fromDate(today)),
        orderBy('fecha', 'desc'),
        limit(1)
      ]
    );

    return () => {
      console.log('Limpiando suscripción a inventario');
      unsubscribe();
    };
  }, [user, navigate]);

  const handleManualUpdate = useCallback(async (
    field: keyof InventarioVehiculo,
    newValue: number
  ) => {
    await updateInventario(field, newValue);
  }, [updateInventario]);

  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  const adjustStock = useCallback((field: keyof InventarioVehiculo, delta: number) => {
    const currentValue = inventario[field] as number;
    const newValue = Math.max(0, currentValue + delta);
    updateInventario(field, newValue);
  }, [inventario, updateInventario]);

  const resetInventario = useCallback(async () => {
    if (!user) return;

    setSaving(true);
    try {
      const newInventario = {
        ...inventario,
        ...INVENTARIO_INICIAL,
        updatedAt: new Date()
      };
      
      await setDoc(doc(db, 'inventarioVehiculo', inventario.id), {
        ...newInventario,
        updatedAt: serverTimestamp()
      });
      
      setInventario(newInventario);
      toast.success('Inventario restablecido');
    } catch (error) {
      console.error('Error al restablecer inventario:', error);
      toast.error('Error al restablecer inventario');
    } finally {
      setSaving(false);
    }
  }, [inventario, user]);

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Inventario del Vehículo
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
            <Clock className="h-4 w-4 mr-1" />
            Última actualización: {formatDate(inventario.updatedAt)}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {saving && <LoadingSpinner size="sm" />}
          <button
            onClick={() => window.print()}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            title="Imprimir inventario"
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
          setIsEditing={(value) => setEditingField(value ? 'sodas' : null)}
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
          setIsEditing={(value) => setEditingField(value ? 'bidones10' : null)}
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
          setIsEditing={(value) => setEditingField(value ? 'bidones20' : null)}
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
          setIsEditing={(value) => setEditingField(value ? 'envasesDevueltos' : null)}
          nivelCritico={NIVELES_CRITICOS.envasesDevueltos}
          disabled={saving}
        />
      </div>

      <div className="flex justify-end space-x-4">
        {showResetConfirm ? (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">¿Estás seguro?</span>
            <button
              onClick={() => {
                resetInventario();
                setShowResetConfirm(false);
              }}
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
          body * {
            visibility: hidden;
          }
          .inventory-section, .inventory-section * {
            visibility: visible;
          }
          .inventory-section {
            position: absolute;
            left: 0;
            top: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};