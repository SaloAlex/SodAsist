import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Cliente, Entrega, InventarioVehiculo } from '../types';

interface AppState {
  // Theme
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  
  // Clients
  clientes: Cliente[];
  setClientes: (clientes: Cliente[]) => void;
  addCliente: (cliente: Cliente) => void;
  updateCliente: (id: string, cliente: Partial<Cliente>) => void;
  removeCliente: (id: string) => void;
  
  // Deliveries
  entregas: Entrega[];
  setEntregas: (entregas: Entrega[]) => void;
  addEntrega: (entrega: Entrega) => void;
  
  // Inventory
  inventario: InventarioVehiculo | null;
  setInventario: (inventario: InventarioVehiculo) => void;
  
  // Route
  rutaOptimizada: Cliente[];
  setRutaOptimizada: (ruta: Cliente[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => {
        set({ theme });
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
      },
      
      clientes: [],
      setClientes: (clientes) => set({ clientes }),
      addCliente: (cliente) => set((state) => ({ clientes: [...state.clientes, cliente] })),
      updateCliente: (id, cliente) => set((state) => ({
        clientes: state.clientes.map(c => c.id === id ? { ...c, ...cliente } : c)
      })),
      removeCliente: (id) => set((state) => ({
        clientes: state.clientes.filter(c => c.id !== id)
      })),
      
      entregas: [],
      setEntregas: (entregas) => set({ entregas }),
      addEntrega: (entrega) => set((state) => ({ entregas: [...state.entregas, entrega] })),
      
      inventario: null,
      setInventario: (inventario) => set({ inventario }),
      
      rutaOptimizada: [],
      setRutaOptimizada: (ruta) => set({ rutaOptimizada: ruta }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({ 
        theme: state.theme,
        inventario: state.inventario,
        rutaOptimizada: state.rutaOptimizada
      }),
    }
  )
);