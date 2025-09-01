import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Dashboard } from '../../pages/Dashboard';
import { Clientes } from '../../pages/Clientes';
import { Entregas } from '../../pages/Entregas';
import { RutaHoy } from '../../pages/RutaHoy';
import { Inventario } from '../../pages/Inventario';
import { Reportes } from '../../pages/Reportes';
import { Ajustes } from '../../pages/Ajustes';
import { Login } from '../../pages/Login';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { ClientesList } from '../clientes/ClientesList';
import { ClienteForm } from '../clientes/ClienteForm';
import { EntregaForm } from '../entregas/EntregaForm';
import { EntregasList } from '../entregas/EntregasList';
import { FirebaseStatus } from './FirebaseStatus';
import { Menu, X } from 'lucide-react';

export const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header fijo en la parte superior */}
      <Header className="fixed top-0 left-0 right-0 z-30" />
      
      {/* Botón de menú móvil */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-40 lg:hidden bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg"
        aria-label="Toggle menu"
      >
        {isSidebarOpen ? (
          <X className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        ) : (
          <Menu className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        )}
      </button>

      <div className="flex pt-16"> {/* pt-16 para compensar el header fijo */}
        {/* Sidebar con overlay en móvil */}
        <div
          className={`fixed inset-0 bg-black bg-opacity-50 z-20 transition-opacity lg:hidden ${
            isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={toggleSidebar}
        />
        
        <Sidebar 
          className={`fixed lg:static h-[calc(100vh-4rem)] z-30 transition-transform duration-300 transform lg:transform-none ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Contenido principal */}
        <main className="flex-1 p-4 lg:p-6 w-full overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/clientes" element={<ProtectedRoute requiredRole={['owner', 'admin']}><Clientes /></ProtectedRoute>}>
                <Route index element={<ClientesList />} />
                <Route path="new" element={<ClienteForm />} />
                <Route path="nuevo" element={<Navigate to="/clientes/new" replace />} />
                <Route path=":id" element={<ClienteForm />} />
              </Route>
              <Route path="/entregas" element={<ProtectedRoute requiredRole={['owner', 'admin']}><Entregas /></ProtectedRoute>}>
                <Route index element={<EntregasList />} />
                <Route path="new" element={<EntregaForm />} />
                <Route path="nuevo" element={<Navigate to="/entregas/new" replace />} />
              </Route>
              <Route 
                path="/ruta-hoy" 
                element={
                  <ProtectedRoute requiredRole={['owner', 'admin', 'manager', 'sodero']}>
                    <RutaHoy />
                  </ProtectedRoute>
                } 
              />
              <Route path="/ruta" element={<Navigate to="/ruta-hoy" replace />} />
              <Route path="/inventario" element={<ProtectedRoute requiredRole={['owner', 'admin']}><Inventario /></ProtectedRoute>} />
              <Route path="/reportes" element={<ProtectedRoute requiredRole={['owner', 'admin']}><Reportes /></ProtectedRoute>} />
              <Route path="/ajustes" element={<ProtectedRoute><Ajustes /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
      
      {/* Componente de estado de Firebase */}
      <FirebaseStatus />
    </div>
  );
};