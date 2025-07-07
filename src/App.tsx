import React from 'react';
import { createBrowserRouter, RouterProvider, createRoutesFromElements, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/common/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Clientes } from './pages/Clientes';
import { ClientesList } from './components/clientes/ClientesList';
import { ClienteForm } from './components/clientes/ClienteForm';
import { Entregas } from './pages/Entregas';
import { EntregaForm } from './components/entregas/EntregaForm';
import { RutaHoy } from './pages/RutaHoy';
import { Inventario } from './pages/Inventario';
import { Reportes } from './pages/Reportes';
import { Ajustes } from './pages/Ajustes';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAppStore } from './store/appStore';
import { Toaster } from 'react-hot-toast';

// Componente para manejar errores
const ErrorBoundary: React.FC<{ error?: Error }> = ({ error }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            ¡Ups! Algo salió mal
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {error?.message || 'La página que buscas no existe.'}
          </p>
          <div className="mt-4 text-center">
            <a
              href="/"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Volver al inicio →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route errorElement={<ErrorBoundary />}>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="clientes" element={<ProtectedRoute requiredRole="admin"><Clientes /></ProtectedRoute>}>
          <Route index element={<ClientesList />} />
          <Route path="new" element={<ClienteForm />} />
          <Route path="nuevo" element={<Navigate to="../new" replace />} />
          <Route path=":id" element={<ClienteForm />} />
        </Route>
        <Route path="entregas" element={<ProtectedRoute requiredRole="admin"><Entregas /></ProtectedRoute>}>
          <Route index element={<div>Lista de Entregas</div>} />
          <Route path="new" element={<EntregaForm />} />
          <Route path="nuevo" element={<Navigate to="../new" replace />} />
        </Route>
        <Route 
          path="ruta-hoy" 
          element={
            <ProtectedRoute requiredRole={['admin', 'sodero']}>
              <RutaHoy />
            </ProtectedRoute>
          } 
        />
        <Route path="ruta" element={<Navigate to="/ruta-hoy" replace />} />
        <Route path="inventario" element={<ProtectedRoute requiredRole="admin"><Inventario /></ProtectedRoute>} />
        <Route path="reportes" element={<ProtectedRoute requiredRole="admin"><Reportes /></ProtectedRoute>} />
        <Route path="ajustes" element={<ProtectedRoute requiredRole="admin"><Ajustes /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<ErrorBoundary />} />
    </Route>
  )
);

function App() {
  const { setTheme } = useAppStore();

  React.useEffect(() => {
    const theme = localStorage.getItem('theme') || 'light';
    setTheme(theme as 'light' | 'dark');
  }, [setTheme]);

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