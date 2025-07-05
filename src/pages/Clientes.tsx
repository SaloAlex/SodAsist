import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ClientesList } from '../components/clientes/ClientesList';
import { ClienteForm } from '../components/clientes/ClienteForm';

export const Clientes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<ClientesList />} />
      <Route path="/new" element={<ClienteForm />} />
      <Route path="/:id" element={<ClienteForm />} />
    </Routes>
  );
};