import React from 'react';
import { createBrowserRouter, RouterProvider, createRoutesFromElements, Route } from 'react-router-dom';
import { Layout } from './components/common/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Clientes } from './pages/Clientes';
import { Entregas } from './pages/Entregas';
import { RutaHoy } from './pages/RutaHoy';
import { Inventario } from './pages/Inventario';
import { Reportes } from './pages/Reportes';
import { Ajustes } from './pages/Ajustes';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';
import { Toaster } from 'react-hot-toast';

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/entregas" element={<Entregas />} />
        <Route path="/ruta" element={<RutaHoy />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/reportes" element={<Reportes />} />
        <Route path="/ajustes" element={<Ajustes />} />
      </Route>
    </Route>
  ),
  {
    future: {
      v7_relativeSplatPath: true
    }
  }
);

function App() {
  const { initializeAuth } = useAuthStore();
  const { setTheme } = useAppStore();

  React.useEffect(() => {
    initializeAuth();
    const theme = localStorage.getItem('theme') || 'light';
    setTheme(theme as 'light' | 'dark');
  }, [initializeAuth, setTheme]);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: document.documentElement.classList.contains('dark') ? '#374151' : '#fff',
            color: document.documentElement.classList.contains('dark') ? '#fff' : '#374151',
          },
        }}
      />
    </>
  );
}

export default App;