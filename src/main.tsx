import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';

// Log global de errores (solo producción)
if (import.meta.env.PROD) {
  window.addEventListener('error', (e) => {
    console.error('[GlobalError]', e.message, e.error?.stack || '');
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[PromiseRejection]', e.reason);
  });
}

const router = createBrowserRouter([
  {
    path: '/*',
    element: <App />,
  }
], {
  future: {
    v7_relativeSplatPath: true
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
