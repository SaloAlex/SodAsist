import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { ClientesList } from '../../components/clientes/ClientesList';

// Mock Firebase service
vi.mock('../../services/firebaseService', () => ({
  FirebaseService: {
    getCollection: vi.fn(() => Promise.resolve([])),
  },
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('ClientesList', () => {
  it('renders without crashing', () => {
    renderWithRouter(<ClientesList />);
  });

  it('displays the correct title', () => {
    renderWithRouter(<ClientesList />);
    expect(screen.getByText('Clientes')).toBeInTheDocument();
  });

  it('shows new client button', () => {
    renderWithRouter(<ClientesList />);
    expect(screen.getByText('Nuevo Cliente')).toBeInTheDocument();
  });
});