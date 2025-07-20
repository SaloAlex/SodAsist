import jsPDF from 'jspdf';
import { ClienteConRuta, RutaOptimizada, Visita } from '../types';

export interface ExportData {
  clientes: ClienteConRuta[];
  rutaOptimizada: RutaOptimizada | null;
  visitasCompletadas: Map<string, Visita>;
  ubicacionActual?: { lat: number; lng: number } | null;
  fechaRuta: Date;
  sodero?: string;
}

export class ExportService {
  
  /**
   * Exporta la ruta completa a PDF
   */
  static async exportToPDF(data: ExportData): Promise<Blob> {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPosition = 20;

    // Header
    pdf.setFontSize(18);
    pdf.text('REPORTE DE RUTA DIARIA', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 15;
    pdf.setFontSize(12);
    pdf.text(`Fecha: ${data.fechaRuta.toLocaleDateString('es-AR')}`, pageWidth / 2, yPosition, { align: 'center' });
    
    if (data.sodero) {
      yPosition += 8;
      pdf.text(`Sodero: ${data.sodero}`, pageWidth / 2, yPosition, { align: 'center' });
    }

    yPosition += 20;

    // Estadísticas generales
    pdf.setFontSize(14);
    pdf.text('RESUMEN EJECUTIVO', 20, yPosition);
    
    yPosition += 15;
    pdf.setFontSize(10);

    const clientesTotal = data.clientes.length;
    const clientesCompletados = data.visitasCompletadas.size;
    const porcentajeCompletado = clientesTotal > 0 ? ((clientesCompletados / clientesTotal) * 100).toFixed(1) : '0';
    
    const stats = [
      `Total de clientes programados: ${clientesTotal}`,
      `Clientes visitados: ${clientesCompletados} (${porcentajeCompletado}%)`,
      `Clientes pendientes: ${clientesTotal - clientesCompletados}`,
      `Distancia total: ${data.rutaOptimizada ? (data.rutaOptimizada.distanciaTotal / 1000).toFixed(1) : '0'} km`,
      `Tiempo estimado: ${data.rutaOptimizada ? Math.floor(data.rutaOptimizada.tiempoEstimadoTotal / 3600) : 0}h ${data.rutaOptimizada ? Math.floor((data.rutaOptimizada.tiempoEstimadoTotal % 3600) / 60) : 0}m`
    ];

    if (data.ubicacionActual) {
      stats.push(`Ubicacion inicial: ${data.ubicacionActual.lat.toFixed(4)}, ${data.ubicacionActual.lng.toFixed(4)}`);
    }

    stats.forEach(stat => {
      pdf.text(stat, 20, yPosition);
      yPosition += 8;
    });

    yPosition += 15;

    // Detalle de clientes
    pdf.setFontSize(14);
    pdf.text('DETALLE DE CLIENTES', 20, yPosition);
    
    yPosition += 15;
    pdf.setFontSize(10);

    data.clientes.forEach((cliente, index) => {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }

      const visita = data.visitasCompletadas.get(cliente.id!);
      const estado = visita ? 'Completado' : 'Pendiente';
      const hora = visita ? new Date(visita.fecha.seconds * 1000).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '-';

      pdf.text(`${index + 1}. ${cliente.nombre}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`   Direccion: ${cliente.direccion}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`   Zona: ${cliente.zona || 'Sin zona'} | Estado: ${estado} | Hora: ${hora}`, 20, yPosition);
      yPosition += 10;
    });

    // Pie de página
    const totalPages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(`Generado el ${new Date().toLocaleString('es-AR')} - SodAsist - Pagina ${i} de ${totalPages}`, pageWidth / 2, 285, { align: 'center' });
    }

    return pdf.output('blob');
  }

  /**
   * Exporta los datos a CSV
   */
  static async exportToCSV(data: ExportData): Promise<Blob> {
    const headers = [
      'Orden',
      'Cliente',
      'Telefono',
      'Direccion',
      'Zona',
      'Frecuencia',
      'Dia Visita',
      'Estado',
      'Hora Completado',
      'Latitud',
      'Longitud',
      'Observaciones'
    ];

    const rows = data.clientes.map((cliente, index) => {
      const visita = data.visitasCompletadas.get(cliente.id!);
      const estado = visita ? 'Completado' : 'Pendiente';
      const horaCompletado = visita 
        ? new Date(visita.fecha.seconds * 1000).toLocaleString('es-AR')
        : '';

      return [
        index + 1,
        cliente.nombre,
        cliente.telefono,
        cliente.direccion,
        cliente.zona || '',
        cliente.frecuenciaVisita,
        cliente.diaVisita,
        estado,
        horaCompletado,
        cliente.coords?.lat || '',
        cliente.coords?.lng || '',
        cliente.observaciones || ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(field => 
          typeof field === 'string' && (field.includes(',') || field.includes('"')) 
            ? `"${field.replace(/"/g, '""')}"` 
            : field
        ).join(',')
      )
    ].join('\n');

    return new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  }

  /**
   * Exporta hoja de ruta para imprimir (formato simple)
   */
  static async exportToRouteSheet(data: ExportData): Promise<Blob> {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPosition = 20;

    // Header simple
    pdf.setFontSize(16);
    pdf.text('HOJA DE RUTA', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 10;
    pdf.setFontSize(10);
    pdf.text(`${data.fechaRuta.toLocaleDateString('es-AR')} - Total: ${data.clientes.length} clientes`, pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 20;

    // Lista simple de clientes
    pdf.setFontSize(11);
    
    data.clientes.forEach((cliente, index) => {
      if (yPosition > 240) {
        pdf.addPage();
        yPosition = 20;
      }

      // Número y nombre
      pdf.text(`${index + 1}. ${cliente.nombre}`, 20, yPosition);
      yPosition += 8;
      
      // Dirección
      pdf.text(`Direccion: ${cliente.direccion}`, 25, yPosition);
      yPosition += 6;
      
      // Teléfono y zona
      const info = `Telefono: ${cliente.telefono}${cliente.zona ? ` | Zona: ${cliente.zona}` : ''}`;
      pdf.text(info, 25, yPosition);
      yPosition += 6;
      
      // Espacio para firma
      pdf.setFontSize(9);
      pdf.text('Firma: _________________ Hora: _______ Observaciones: ________________________', 25, yPosition);
      
      yPosition += 15;
      
      // Línea separadora
      if (index < data.clientes.length - 1) {
        pdf.line(20, yPosition - 5, pageWidth - 20, yPosition - 5);
      }
    });

    return pdf.output('blob');
  }
} 