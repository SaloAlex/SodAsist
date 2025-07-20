import { AuthProvider } from './components/auth/AuthProvider';
import { GoogleMapsProvider } from './components/common/GoogleMapsProvider';
import { Layout } from './components/common/Layout';
import { Toaster } from 'react-hot-toast';
import './index.css';
import { useEffect } from 'react';
import { useAppStore } from './store/appStore';

function App() {
  const { setTheme } = useAppStore();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, [setTheme]);

  return (
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
  );
}

export default App;