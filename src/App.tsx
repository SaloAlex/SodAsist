import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthProvider';
import { GoogleMapsProvider } from './components/common/GoogleMapsProvider';
import { Layout } from './components/common/Layout';
import { Toaster } from 'react-hot-toast';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <GoogleMapsProvider>
          <Layout />
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#333',
                color: '#fff',
              },
            }}
          />
        </GoogleMapsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;