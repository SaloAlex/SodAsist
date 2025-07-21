import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Activity,
  MoreHorizontal,
  Download,
  Maximize2,
  RefreshCw
} from 'lucide-react';

interface ChartCardProps {
  title: string;
  data: Array<Record<string, string | number>>;
  type?: 'line' | 'bar' | 'area' | 'composed' | 'pie';
  dataKey: string;
  xAxisKey: string;
  color?: string;
  colors?: string[];
  secondaryDataKey?: string;
  height?: number;
  loading?: boolean;
  subtitle?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  animated?: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
  onMaximize?: () => void;
  customTooltip?: React.ComponentType<{ active?: boolean; payload?: Array<{ name: string; value: string | number; color: string }>; label?: string }>;
  gradient?: boolean;
  strokeWidth?: number;
  barRadius?: number;
  showDots?: boolean;
  fillOpacity?: number;
}

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  data,
  type = 'line',
  dataKey,
  xAxisKey,
  color = '#3B82F6',
  colors = COLORS,
  secondaryDataKey,
  height = 300,
  loading = false,
  subtitle,
  showLegend = false,
  showGrid = true,
  showTooltip = true,
  animated = true,
  onRefresh,
  onExport,
  onMaximize,
  customTooltip,
  gradient = false,
  strokeWidth = 2,
  barRadius = 4,
  showDots = true,
  fillOpacity = 0.1
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [chartType, setChartType] = useState(type);

  // Tooltip personalizado por defecto
  const DefaultTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: string | number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {label}
          </p>
          {payload.map((entry, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}:</span>{' '}
              {typeof entry.value === 'number' && entry.name?.toLowerCase().includes('precio') || entry.name?.toLowerCase().includes('total')
                ? `$${entry.value.toLocaleString('es-AR')}`
                : entry.value?.toLocaleString('es-AR') || entry.value
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const TooltipComponent = customTooltip || DefaultTooltip;

  // Iconos para tipos de gráfico
  const chartIcons = {
    line: Activity,
    bar: BarChart3,
    area: TrendingUp,
    composed: BarChart3,
    pie: PieChartIcon
  };

  const ChartIcon = chartIcons[chartType];

  // Renderizar gráfico según tipo
  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    const commonAxisProps = {
      axisLine: false,
      tickLine: false,
      tick: { fontSize: 12, fill: 'currentColor' },
      className: 'text-gray-600 dark:text-gray-400'
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            <XAxis dataKey={xAxisKey} {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            {showTooltip && <Tooltip content={<TooltipComponent />} />}
            {showLegend && <Legend />}
            
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={strokeWidth}
              dot={showDots ? { fill: color, strokeWidth: 2, r: 4 } : false}
              activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
              animationDuration={animated ? 1000 : 0}
            />
            
            {secondaryDataKey && (
              <Line
                type="monotone"
                dataKey={secondaryDataKey}
                stroke={colors[1]}
                strokeWidth={strokeWidth}
                strokeDasharray="5 5"
                dot={showDots ? { fill: colors[1], strokeWidth: 2, r: 3 } : false}
                animationDuration={animated ? 1200 : 0}
              />
            )}
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            <XAxis dataKey={xAxisKey} {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            {showTooltip && <Tooltip content={<TooltipComponent />} />}
            {showLegend && <Legend />}
            
            <Bar
              dataKey={dataKey}
              fill={color}
              radius={[barRadius, barRadius, 0, 0]}
              animationDuration={animated ? 1000 : 0}
            />
            
            {secondaryDataKey && (
              <Bar
                dataKey={secondaryDataKey}
                fill={colors[1]}
                radius={[barRadius, barRadius, 0, 0]}
                animationDuration={animated ? 1200 : 0}
              />
            )}
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id={`colorGradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={color} stopOpacity={0.1} />
              </linearGradient>
              {secondaryDataKey && (
                <linearGradient id={`colorGradient-${secondaryDataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[1]} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={colors[1]} stopOpacity={0.1} />
                </linearGradient>
              )}
            </defs>
            
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            <XAxis dataKey={xAxisKey} {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            {showTooltip && <Tooltip content={<TooltipComponent />} />}
            {showLegend && <Legend />}
            
            <Area
              type="monotone"
              dataKey={dataKey}
              stackId="1"
              stroke={color}
              fill={gradient ? `url(#colorGradient-${dataKey})` : color}
              fillOpacity={fillOpacity}
              animationDuration={animated ? 1000 : 0}
            />
            
            {secondaryDataKey && (
              <Area
                type="monotone"
                dataKey={secondaryDataKey}
                stackId="2"
                stroke={colors[1]}
                fill={gradient ? `url(#colorGradient-${secondaryDataKey})` : colors[1]}
                fillOpacity={fillOpacity}
                animationDuration={animated ? 1200 : 0}
              />
            )}
          </AreaChart>
        );

      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            <XAxis dataKey={xAxisKey} {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            {showTooltip && <Tooltip content={<TooltipComponent />} />}
            {showLegend && <Legend />}
            
            <Bar
              dataKey={dataKey}
              fill={color}
              radius={[barRadius, barRadius, 0, 0]}
              animationDuration={animated ? 1000 : 0}
            />
            
            {secondaryDataKey && (
              <Line
                type="monotone"
                dataKey={secondaryDataKey}
                stroke={colors[1]}
                strokeWidth={strokeWidth + 1}
                dot={{ fill: colors[1], strokeWidth: 2, r: 4 }}
                animationDuration={animated ? 1200 : 0}
              />
            )}
          </ComposedChart>
        );

      case 'pie':
        return (
          <PieChart {...commonProps}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill={color}
              dataKey={dataKey}
              animationBegin={0}
              animationDuration={animated ? 1000 : 0}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                  stroke={activeIndex === index ? '#fff' : 'none'}
                  strokeWidth={activeIndex === index ? 2 : 0}
                />
              ))}
            </Pie>
            {showTooltip && <Tooltip content={<TooltipComponent />} />}
            {showLegend && <Legend />}
          </PieChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-2">
        <div className="flex-1">
          <div className="flex items-center">
            <ChartIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          </div>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>

        {/* Controles */}
        <div className="flex items-center space-x-2">
          {/* Selector de tipo de gráfico */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {(['line', 'bar', 'area'] as const).map((chartTypeOption) => {
              const Icon = chartIcons[chartTypeOption];
              return (
                <button
                  key={chartTypeOption}
                  onClick={() => setChartType(chartTypeOption)}
                  className={`p-1.5 rounded transition-colors ${
                    chartType === chartTypeOption
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title={chartTypeOption.charAt(0).toUpperCase() + chartTypeOption.slice(1)}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>

          {/* Botones de acción */}
          <div className="flex items-center space-x-1">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Actualizar datos"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
            
            {onExport && (
              <button
                onClick={onExport}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Exportar gráfico"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            
            {onMaximize && (
              <button
                onClick={onMaximize}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Maximizar"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}

            <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Gráfico */}
      <div className="px-6 pb-6">
        <div className="relative" style={{ height: `${height}px` }}>
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Cargando datos...
                </span>
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-center">
                <ChartIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  No hay datos disponibles
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Los datos aparecerán aquí cuando estén disponibles
                </p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {renderChart() || <div>No chart available</div>}
            </ResponsiveContainer>
          )}
        </div>

        {/* Estadísticas adicionales */}
        {data.length > 0 && !loading && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Máximo</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {Math.max(...data.map(d => typeof d[dataKey] === 'number' ? d[dataKey] : 0)).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Promedio</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {Math.round(data.reduce((sum, d) => sum + (typeof d[dataKey] === 'number' ? d[dataKey] : 0), 0) / data.length).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {data.reduce((sum, d) => sum + (typeof d[dataKey] === 'number' ? d[dataKey] : 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};