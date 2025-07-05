import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ClientesList } from '../../components/clientes/ClientesList';

// Mock Firebase service
jest.mock('../../services/firebaseService', () => ({
  FirebaseService: {
    getCollection: jest.fn(() => Promise.resolve([])),
  },
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
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