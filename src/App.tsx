import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';

// Components
import { Layout } from './components/common/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Clientes } from './pages/Clientes';
import { RutaHoy } from './pages/RutaHoy';
import { Entregas } from './pages/Entregas';
import { Inventario } from './pages/Inventario';
import { Reportes } from './pages/Reportes';
import { Ajustes } from './pages/Ajustes';

function App() {
  useAuth();
  const { user, loading } = useAuthStore();
  const { theme } = useAppStore();

  useEffect(() => {
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className={theme === 'dark' ? 'dark' : ''}>
        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to="/dashboard" replace /> : <Login />} 
          />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="clientes/*" element={<Clientes />} />
            <Route path="ruta-hoy" element={<RutaHoy />} />
            <Route path="entregas/*" element={<Entregas />} />
            <Route path="inventario" element={<Inventario />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="ajustes" element={<Ajustes />} />
          </Route>
        </Routes>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: theme === 'dark' ? '#374151' : '#fff',
              color: theme === 'dark' ? '#fff' : '#374151',
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;