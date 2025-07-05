import React, { useState, useEffect } from 'react';
import { Package, Plus, Minus, RotateCcw } from 'lucide-react';
import { InventarioVehiculo } from '../types';
import { FirebaseService } from '../services/firebaseService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

export const Inventario: React.FC = () => {
  const [inventario, setInventario] = useState<InventarioVehiculo>({
    fecha: new Date(),
    sodas: 0,
    bidones10: 0,
    bidones20: 0,
    updatedAt: new Date(),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadInventario();
  }, []);

  const loadInventario = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await FirebaseService.getCollection<InventarioVehiculo>('inventarioVehiculo');
      
      const todayInventario = data.find(inv => 
        new Date(inv.fecha).toISOString().split('T')[0] === today
      );

      if (todayInventario) {
        setInventario(todayInventario);
      }
    } catch (error) {
      console.error('Error al cargar inventario:', error);
      toast.error('Error al cargar inventario');
    } finally {
      setLoading(false);
    }
  };

  const updateInventario = async (field: keyof InventarioVehiculo, value: number) => {
    const updated = { ...inventario, [field]: value, updatedAt: new Date() };
    setInventario(updated);
    
    setSaving(true);
    try {
      await FirebaseService.createDocument('inventarioVehiculo', updated);
      toast.success('Inventario actualizado');
    } catch (error) {
      console.error('Error al actualizar inventario:', error);
      toast.error('Error al actualizar inventario');
    } finally {
      setSaving(false);
    }
  };

  const adjustStock = (field: keyof InventarioVehiculo, delta: number) => {
    const currentValue = inventario[field] as number;
    const newValue = Math.max(0, currentValue + delta);
    updateInventario(field, newValue);
  };

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
        {saving && <LoadingSpinner size="sm" />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            >
              <Minus className="h-5 w-5 mx-auto" />
            </button>
            <button
              onClick={() => adjustStock('sodas', 1)}
              className="flex-1 p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
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
            >
              <Minus className="h-5 w-5 mx-auto" />
            </button>
            <button
              onClick={() => adjustStock('bidones10', 1)}
              className="flex-1 p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
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
            >
              <Minus className="h-5 w-5 mx-auto" />
            </button>
            <button
              onClick={() => adjustStock('bidones20', 1)}
              className="flex-1 p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
            >
              <Plus className="h-5 w-5 mx-auto" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Acciones Rápidas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => {
              setInventario(prev => ({
                ...prev,
                sodas: 100,
                bidones10: 50,
                bidones20: 30,
                updatedAt: new Date()
              }));
              toast.success('Inventario restablecido');
            }}
            className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
          >
            <RotateCcw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-blue-700 dark:text-blue-300">Cargar Inventario Completo</span>
          </button>
          
          <button
            onClick={() => {
              setInventario(prev => ({
                ...prev,
                sodas: 0,
                bidones10: 0,
                bidones20: 0,
                updatedAt: new Date()
              }));
              toast.success('Inventario vaciado');
            }}
            className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900 rounded-lg hover:bg-red-100 dark:hover:bg-red-800 transition-colors"
          >
            <Package className="h-5 w-5 text-red-600 dark:text-red-400" />
            <span className="text-red-700 dark:text-red-300">Vaciar Inventario</span>
          </button>
        </div>
      </div>
    </div>
  );
};