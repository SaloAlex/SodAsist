import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { EntregaForm } from '../components/entregas/EntregaForm';

export const Entregas: React.FC = () => {
  return (
    <Routes>
      <Route path="new" element={<EntregaForm />} />
      <Route path="nuevo" element={<EntregaForm />} />
    </Routes>
  );
};