import { Component, ReactNode } from 'react';
import { AlertTriangle, MapPin } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GoogleMapsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }) {
    console.error('Google Maps Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-600 dark:text-yellow-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            Google Maps no disponible temporalmente
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
            Se requiere configuración adicional de Google Cloud Platform.
          </p>
          <div className="bg-white dark:bg-gray-800 rounded-md p-4 text-left text-sm">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center">
              <MapPin className="h-4 w-4 mr-2" />
              Funcionalidad alternativa:
            </h4>
            <ul className="text-gray-700 dark:text-gray-300 space-y-1">
              <li>• Las direcciones se mostrarán como texto</li>
              <li>• La navegación funcionará normalmente</li>
              <li>• Los mapas se habilitarán próximamente</li>
            </ul>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
