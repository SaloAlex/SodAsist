import React, { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Minus, RotateCcw } from 'lucide-react';
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Inventario del Vehículo
        </h1>
        <div className="flex items-center space-x-4">
          {saving && <LoadingSpinner size="sm" />}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Sodas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Package className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Sodas
              </h3>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {inventario.sodas}
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => adjustStock('sodas', -1)}
              className="flex-1 p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
              disabled={saving}
            >
              <Minus className="h-5 w-5 mx-auto" />
            </button>
            <button
              onClick={() => adjustStock('sodas', 1)}
              className="flex-1 p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
              disabled={saving}
            >
              <Plus className="h-5 w-5 mx-auto" />
            </button>
          </div>
        </div>

        {/* Bidones 10L */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Package className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Bidones 10L
              </h3>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {inventario.bidones10}
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => adjustStock('bidones10', -1)}
              className="flex-1 p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
              disabled={saving}
            >
              <Minus className="h-5 w-5 mx-auto" />
            </button>
            <button
              onClick={() => adjustStock('bidones10', 1)}
              className="flex-1 p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
              disabled={saving}
            >
              <Plus className="h-5 w-5 mx-auto" />
            </button>
          </div>
        </div>

        {/* Bidones 20L */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Package className="h-6 w-6 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Bidones 20L
              </h3>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {inventario.bidones20}
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => adjustStock('bidones20', -1)}
              className="flex-1 p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
              disabled={saving}
            >
              <Minus className="h-5 w-5 mx-auto" />
            </button>
            <button
              onClick={() => adjustStock('bidones20', 1)}
              className="flex-1 p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
              disabled={saving}
            >
              <Plus className="h-5 w-5 mx-auto" />
            </button>
          </div>
        </div>

        {/* Envases Devueltos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Package className="h-6 w-6 text-yellow-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Envases Devueltos
              </h3>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {inventario.envasesDevueltos}
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => adjustStock('envasesDevueltos', -1)}
              className="flex-1 p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
              disabled={saving}
            >
              <Minus className="h-5 w-5 mx-auto" />
            </button>
            <button
              onClick={() => adjustStock('envasesDevueltos', 1)}
              className="flex-1 p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
              disabled={saving}
            >
              <Plus className="h-5 w-5 mx-auto" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={resetInventario}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          disabled={saving}
        >
          <RotateCcw className="h-5 w-5" />
          <span>Restablecer Inventario</span>
        </button>
      </div>
    </div>
  );
};