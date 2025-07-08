import React from 'react';
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

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute requiredRole="admin"><Clientes /></ProtectedRoute>}>
              <Route index element={<ClientesList />} />
              <Route path="new" element={<ClienteForm />} />
              <Route path="nuevo" element={<Navigate to="../new" replace />} />
              <Route path=":id" element={<ClienteForm />} />
            </Route>
            <Route path="/entregas" element={<ProtectedRoute requiredRole="admin"><Entregas /></ProtectedRoute>}>
              <Route index element={<div>Lista de Entregas</div>} />
              <Route path="new" element={<EntregaForm />} />
              <Route path="nuevo" element={<Navigate to="../new" replace />} />
            </Route>
            <Route 
              path="/ruta-hoy" 
              element={
                <ProtectedRoute requiredRole={['admin', 'sodero']}>
                  <RutaHoy />
                </ProtectedRoute>
              } 
            />
            <Route path="/ruta" element={<Navigate to="/ruta-hoy" replace />} />
            <Route path="/inventario" element={<ProtectedRoute requiredRole="admin"><Inventario /></ProtectedRoute>} />
            <Route path="/reportes" element={<ProtectedRoute requiredRole="admin"><Reportes /></ProtectedRoute>} />
            <Route path="/ajustes" element={<ProtectedRoute requiredRole="admin"><Ajustes /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};