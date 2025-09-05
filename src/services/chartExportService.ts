import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ChartExportData {
  title: string;
  subtitle?: string;
  data: Array<Record<string, string | number>>;
  dataKey: string;
  secondaryDataKey?: string;
  xAxisKey: string;
  type: 'line' | 'bar' | 'area' | 'composed' | 'pie';
  color?: string;
  dateRange?: string;
}

export class ChartExportService {
  
  /**
   * Exporta el gráfico como imagen PNG
   */
  static async exportChartAsPNG(
    chartElement: HTMLElement, 
    data: ChartExportData
  ): Promise<Blob> {
    try {
      // Capturar el elemento del gráfico como imagen
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2, // Mayor resolución
        useCORS: true,
        allowTaint: true,
        logging: false
      });

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          }
        }, 'image/png', 0.95);
      });
    } catch (error) {
      console.error('Error exportando gráfico como PNG:', error);
      throw new Error('No se pudo exportar el gráfico como imagen');
    }
  }

  /**
   * Exporta los datos del gráfico como PDF
   */
  static async exportChartAsPDF(data: ChartExportData): Promise<Blob> {
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;

    // Header
    pdf.setFontSize(18);
    pdf.text(data.title, pageWidth / 2, yPosition, { align: 'center' });
    
    if (data.subtitle) {
      yPosition += 10;
      pdf.setFontSize(12);
      pdf.text(data.subtitle, pageWidth / 2, yPosition, { align: 'center' });
    }

    if (data.dateRange) {
      yPosition += 8;
      pdf.setFontSize(10);
      pdf.text(`Período: ${data.dateRange}`, pageWidth / 2, yPosition, { align: 'center' });
    }

    yPosition += 20;

    // Estadísticas del gráfico
    pdf.setFontSize(14);
    pdf.text('ESTADÍSTICAS', 20, yPosition);
    
    yPosition += 15;
    pdf.setFontSize(10);

    const stats = this.calculateChartStats(data);
    const statsText = [
      `Total de registros: ${data.data.length}`,
      `Valor máximo: ${stats.max}`,
      `Valor mínimo: ${stats.min}`,
      `Valor promedio: ${stats.average}`,
      `Suma total: ${stats.total}`
    ];

    statsText.forEach(stat => {
      pdf.text(stat, 20, yPosition);
      yPosition += 8;
    });

    yPosition += 15;

    // Tabla de datos
    pdf.setFontSize(14);
    pdf.text('DATOS DETALLADOS', 20, yPosition);
    
    yPosition += 15;
    pdf.setFontSize(8);

    // Headers de la tabla
    const headers = [data.xAxisKey, data.dataKey];
    if (data.secondaryDataKey) {
      headers.push(data.secondaryDataKey);
    }

    // Ancho de columnas
    const colWidths = [40, 30];
    if (data.secondaryDataKey) {
      colWidths.push(30);
    }

    let xPosition = 20;
    headers.forEach((header, index) => {
      pdf.text(header.toUpperCase(), xPosition, yPosition);
      xPosition += colWidths[index];
    });

    yPosition += 8;
    pdf.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 5;

    // Datos de la tabla
    data.data.forEach((row, index) => {
      if (yPosition > pageHeight - 30) {
        pdf.addPage();
        yPosition = 20;
      }

      xPosition = 20;
      const values = [
        String(row[data.xAxisKey] || ''),
        this.formatValue(row[data.dataKey]),
        data.secondaryDataKey ? this.formatValue(row[data.secondaryDataKey]) : ''
      ].filter(v => v !== '');

      values.forEach((value, colIndex) => {
        pdf.text(value, xPosition, yPosition);
        xPosition += colWidths[colIndex];
      });

      yPosition += 6;
    });

    // Pie de página
    const totalPages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(
        `Generado el ${new Date().toLocaleString('es-AR')} - SodAsist - Página ${i} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    return pdf.output('blob');
  }

  /**
   * Exporta los datos del gráfico como CSV
   */
  static async exportChartAsCSV(data: ChartExportData): Promise<Blob> {
    const headers = [data.xAxisKey, data.dataKey];
    if (data.secondaryDataKey) {
      headers.push(data.secondaryDataKey);
    }

    const rows = data.data.map(row => {
      const values = [
        String(row[data.xAxisKey] || ''),
        this.formatValue(row[data.dataKey]),
        data.secondaryDataKey ? this.formatValue(row[data.secondaryDataKey]) : ''
      ].filter(v => v !== '');

      return values.map(field => 
        typeof field === 'string' && (field.includes(',') || field.includes('"')) 
          ? `"${field.replace(/"/g, '""')}"` 
          : field
      );
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  }

  /**
   * Descarga un archivo desde un Blob
   */
  static downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Calcula estadísticas básicas del gráfico
   */
  private static calculateChartStats(data: ChartExportData) {
    const values = data.data.map(d => typeof d[data.dataKey] === 'number' ? d[data.dataKey] : 0);
    
    return {
      max: Math.max(...values).toLocaleString(),
      min: Math.min(...values).toLocaleString(),
      average: Math.round(values.reduce((sum, val) => sum + val, 0) / values.length).toLocaleString(),
      total: values.reduce((sum, val) => sum + val, 0).toLocaleString()
    };
  }

  /**
   * Formatea valores para exportación
   */
  private static formatValue(value: any): string {
    if (typeof value === 'number') {
      return value.toLocaleString('es-AR');
    }
    return String(value || '');
  }
}
