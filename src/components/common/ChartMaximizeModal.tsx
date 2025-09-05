import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Maximize2, Minimize2 } from 'lucide-react';
import { ChartCard } from '../dashboard/ChartCard';
import { ChartExportService, ChartExportData } from '../../services/chartExportService';
import toast from 'react-hot-toast';

interface ChartMaximizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  chartData: ChartExportData;
  onRefresh?: () => void;
  loading?: boolean;
}

export const ChartMaximizeModal: React.FC<ChartMaximizeModalProps> = ({
  isOpen,
  onClose,
  chartData,
  onRefresh,
  loading = false
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Manejar tecla Escape para cerrar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Manejar fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Exportar como PNG
  const handleExportPNG = async () => {
    if (!chartRef.current) return;

    setExporting(true);
    try {
      const blob = await ChartExportService.exportChartAsPNG(chartRef.current, chartData);
      const filename = `grafico_${chartData.title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.png`;
      ChartExportService.downloadFile(blob, filename);
      toast.success('Gráfico exportado como PNG');
    } catch (error) {
      toast.error('Error al exportar el gráfico');
      console.error('Error exportando PNG:', error);
    } finally {
      setExporting(false);
    }
  };

  // Exportar como PDF
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const blob = await ChartExportService.exportChartAsPDF(chartData);
      const filename = `grafico_${chartData.title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      ChartExportService.downloadFile(blob, filename);
      toast.success('Gráfico exportado como PDF');
    } catch (error) {
      toast.error('Error al exportar el gráfico');
      console.error('Error exportando PDF:', error);
    } finally {
      setExporting(false);
    }
  };

  // Exportar como CSV
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const blob = await ChartExportService.exportChartAsCSV(chartData);
      const filename = `datos_${chartData.title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      ChartExportService.downloadFile(blob, filename);
      toast.success('Datos exportados como CSV');
    } catch (error) {
      toast.error('Error al exportar los datos');
      console.error('Error exportando CSV:', error);
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-75 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 transition-all duration-300 ${
        isFullscreen ? 'w-full h-full m-0 rounded-none' : 'w-[95vw] h-[90vh] max-w-7xl'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {chartData.title}
            </h2>
            {chartData.subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {chartData.subtitle}
              </p>
            )}
          </div>

          {/* Controles */}
          <div className="flex items-center space-x-2">
            {/* Exportar */}
            <div className="relative group">
              <button
                onClick={handleExportPNG}
                disabled={exporting}
                className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <Download className="h-4 w-4 mr-1" />
                Exportar
              </button>
              
              {/* Dropdown de exportación */}
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <div className="py-1">
                  <button
                    onClick={handleExportPNG}
                    disabled={exporting}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    📷 Imagen PNG
                  </button>
                  <button
                    onClick={handleExportPDF}
                    disabled={exporting}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    📄 Documento PDF
                  </button>
                  <button
                    onClick={handleExportCSV}
                    disabled={exporting}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    📊 Datos CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-5 w-5" />
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
            </button>

            {/* Cerrar */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 h-full overflow-hidden">
          <div 
            ref={chartRef}
            className="h-full"
          >
            <ChartCard
              title=""
              subtitle=""
              data={chartData.data}
              type={chartData.type}
              dataKey={chartData.dataKey}
              secondaryDataKey={chartData.secondaryDataKey}
              xAxisKey={chartData.xAxisKey}
              color={chartData.color}
              height={isFullscreen ? window.innerHeight - 200 : 600}
              loading={loading}
              showLegend={true}
              gradient={true}
              animated={true}
              onRefresh={onRefresh}
              onExport={handleExportPNG}
              onMaximize={() => {}} // No hacer nada, ya estamos maximizados
            />
          </div>
        </div>

        {/* Loading overlay */}
        {exporting && (
          <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Exportando...
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
