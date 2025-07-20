import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter
} from 'recharts';

interface GraficoProps {
  data: any[];
  height?: number;
  className?: string;
  tema?: 'claro' | 'oscuro';
}

interface GraficoVentasProps extends GraficoProps {
  mostrarTendencia?: boolean;
  compararPeriodo?: any[];
}

interface GraficoPieProps extends GraficoProps {
  dataKey: string;
  nameKey: string;
  colores?: string[];
}

interface GraficoBarrasProps extends GraficoProps {
  dataKey: string;
  xAxisKey: string;
  color?: string;
  mostrarValores?: boolean;
}

interface GraficoCombinadoProps extends GraficoProps {
  barDataKey: string;
  lineDataKey: string;
  xAxisKey: string;
}

// Paleta de colores
const COLORES_DEFAULT = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

const COLORES_OSCURO = [
  '#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA',
  '#22D3EE', '#A3E635', '#FB923C', '#F472B6', '#818CF8'
];

// Componente de tooltip personalizado
const TooltipPersonalizado = ({ active, payload, label, formatoMoneda = true }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            <span className="font-medium">{entry.name}:</span>{' '}
            {formatoMoneda && entry.name.toLowerCase().includes('ventas') || entry.name.toLowerCase().includes('total')
              ? `$${entry.value.toLocaleString('es-AR')}`
              : entry.value.toLocaleString('es-AR')
            }
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Gráfico de líneas para ventas temporales
export const GraficoVentasTemporal: React.FC<GraficoVentasProps> = ({
  data,
  height = 300,
  className = '',
  tema = 'claro',
  mostrarTendencia = false,
  compararPeriodo
}) => {
  const colores = tema === 'oscuro' ? COLORES_OSCURO : COLORES_DEFAULT;

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="fecha" 
            className="text-xs text-gray-600 dark:text-gray-400"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            className="text-xs text-gray-600 dark:text-gray-400"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<TooltipPersonalizado />} />
          <Legend />
          
          <Line
            type="monotone"
            dataKey="ventas"
            stroke={colores[0]}
            strokeWidth={3}
            dot={{ fill: colores[0], strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: colores[0], strokeWidth: 2 }}
            name="Ventas"
          />
          
          {compararPeriodo && (
            <Line
              type="monotone"
              dataKey="ventasAnterior"
              stroke={colores[1]}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: colores[1], strokeWidth: 2, r: 3 }}
              name="Período Anterior"
            />
          )}
          
          {mostrarTendencia && (
            <Line
              type="monotone"
              dataKey="tendencia"
              stroke={colores[2]}
              strokeWidth={1}
              dot={false}
              name="Tendencia"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Gráfico de área para evolución de métricas
export const GraficoAreaMetricas: React.FC<GraficoProps> = ({
  data,
  height = 300,
  className = '',
  tema = 'claro'
}) => {
  const colores = tema === 'oscuro' ? COLORES_OSCURO : COLORES_DEFAULT;

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colores[0]} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={colores[0]} stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorClientes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colores[1]} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={colores[1]} stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="periodo" className="text-xs" />
          <YAxis className="text-xs" />
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <Tooltip content={<TooltipPersonalizado />} />
          <Area
            type="monotone"
            dataKey="ventas"
            stackId="1"
            stroke={colores[0]}
            fill="url(#colorVentas)"
            name="Ventas"
          />
          <Area
            type="monotone"
            dataKey="clientes"
            stackId="2"
            stroke={colores[1]}
            fill="url(#colorClientes)"
            name="Clientes"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Gráfico de barras
export const GraficoBarras: React.FC<GraficoBarrasProps> = ({
  data,
  dataKey,
  xAxisKey,
  height = 300,
  className = '',
  tema = 'claro',
  color,
  mostrarValores = false
}) => {
  const colores = tema === 'oscuro' ? COLORES_OSCURO : COLORES_DEFAULT;
  const colorBarra = color || colores[0];

  const CustomizedLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
      <text 
        x={x + width / 2} 
        y={y - 6} 
        fill={tema === 'oscuro' ? '#E5E7EB' : '#374151'}
        textAnchor="middle" 
        fontSize="12"
      >
        {value.toLocaleString()}
      </text>
    );
  };

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey={xAxisKey} 
            className="text-xs text-gray-600 dark:text-gray-400"
          />
          <YAxis 
            className="text-xs text-gray-600 dark:text-gray-400"
            tickFormatter={(value) => 
              dataKey.toLowerCase().includes('ventas') || dataKey.toLowerCase().includes('total')
                ? `$${(value / 1000).toFixed(0)}k`
                : value.toLocaleString()
            }
          />
          <Tooltip content={<TooltipPersonalizado />} />
          <Bar 
            dataKey={dataKey} 
            fill={colorBarra}
            radius={[4, 4, 0, 0]}
            label={mostrarValores ? <CustomizedLabel /> : undefined}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Gráfico circular (pie)
export const GraficoPie: React.FC<GraficoPieProps> = ({
  data,
  dataKey,
  nameKey,
  height = 300,
  className = '',
  tema = 'claro',
  colores = COLORES_DEFAULT
}) => {
  const coloresFinales = tema === 'oscuro' ? COLORES_OSCURO : colores;

  const renderLabel = (entry: any) => {
    return `${entry[nameKey]}: ${entry[dataKey].toFixed(1)}%`;
  };

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey={dataKey}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={coloresFinales[index % coloresFinales.length]} 
              />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: any) => [`${value.toFixed(1)}%`, nameKey]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Gráfico combinado (barras + líneas)
export const GraficoCombinado: React.FC<GraficoCombinadoProps> = ({
  data,
  barDataKey,
  lineDataKey,
  xAxisKey,
  height = 300,
  className = '',
  tema = 'claro'
}) => {
  const colores = tema === 'oscuro' ? COLORES_OSCURO : COLORES_DEFAULT;

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey={xAxisKey} className="text-xs" />
          <YAxis yAxisId="left" className="text-xs" />
          <YAxis yAxisId="right" orientation="right" className="text-xs" />
          <Tooltip content={<TooltipPersonalizado />} />
          <Legend />
          <Bar 
            yAxisId="left" 
            dataKey={barDataKey} 
            fill={colores[0]} 
            name="Ventas"
            radius={[2, 2, 0, 0]}
          />
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey={lineDataKey} 
            stroke={colores[1]} 
            strokeWidth={3}
            name="Crecimiento %"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// Gráfico radar para análisis multidimensional
export const GraficoRadar: React.FC<GraficoProps> = ({
  data,
  height = 300,
  className = '',
  tema = 'claro'
}) => {
  const colores = tema === 'oscuro' ? COLORES_OSCURO : COLORES_DEFAULT;

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="metrica" className="text-xs" />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]} 
            className="text-xs"
          />
          <Radar
            name="Performance"
            dataKey="valor"
            stroke={colores[0]}
            fill={colores[0]}
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Gráfico de dispersión para correlaciones
export const GraficoDispersion: React.FC<GraficoProps> = ({
  data,
  height = 300,
  className = '',
  tema = 'claro'
}) => {
  const colores = tema === 'oscuro' ? COLORES_OSCURO : COLORES_DEFAULT;

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid />
          <XAxis 
            type="number" 
            dataKey="x" 
            name="Frecuencia Compras" 
            className="text-xs"
          />
          <YAxis 
            type="number" 
            dataKey="y" 
            name="Valor Cliente" 
            className="text-xs"
          />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter name="Clientes" data={data} fill={colores[0]} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

// Componente de métricas rápidas
export const MetricasRapidas: React.FC<{
  metricas: Array<{
    titulo: string;
    valor: string | number;
    cambio?: number;
    icono?: React.ReactNode;
    color?: string;
  }>;
  className?: string;
}> = ({ metricas, className = '' }) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {metricas.map((metrica, index) => (
        <div 
          key={index}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {metrica.titulo}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {typeof metrica.valor === 'number' 
                  ? metrica.valor.toLocaleString('es-AR')
                  : metrica.valor
                }
              </p>
              {metrica.cambio !== undefined && (
                <p className={`text-sm font-medium ${
                  metrica.cambio > 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : metrica.cambio < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {metrica.cambio > 0 ? '+' : ''}{metrica.cambio.toFixed(1)}%
                </p>
              )}
            </div>
            {metrica.icono && (
              <div className={`p-2 rounded-lg ${metrica.color || 'bg-blue-100 dark:bg-blue-900'}`}>
                {metrica.icono}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Componente de progreso circular
export const ProgresoCircular: React.FC<{
  porcentaje: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  children?: React.ReactNode;
}> = ({ 
  porcentaje, 
  size = 120, 
  strokeWidth = 8, 
  color = '#3B82F6',
  backgroundColor = '#E5E7EB',
  children 
}) => {
  const radio = (size - strokeWidth) / 2;
  const circunferencia = radio * 2 * Math.PI;
  const offset = circunferencia - (porcentaje / 100) * circunferencia;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radio}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radio}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circunferencia}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            {porcentaje.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}; 