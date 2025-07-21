import React, { useEffect, useState } from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus, Info, Eye, MoreHorizontal } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'pink' | 'orange';
  change?: {
    value: number;
    positive: boolean;
    period?: string;
  };
  target?: number;
  subtitle?: string;
  loading?: boolean;
  onClick?: () => void;
  showProgress?: boolean;
  progressValue?: number;
  trend?: number[];
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'gradient' | 'minimal' | 'outlined';
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
  change,
  target,
  subtitle,
  loading = false,
  onClick,
  showProgress = false,
  progressValue = 0,
  trend = [],
  description,
  actionLabel,
  onAction,
  size = 'md',
  variant = 'default'
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);

  // Animación del contador
  useEffect(() => {
    if (loading) return;
    
    const numericValue = typeof value === 'string' 
      ? parseFloat(value.replace(/[^0-9.-]/g, '')) || 0
      : typeof value === 'number' ? value : 0;
    
    // Validar que el valor numérico sea válido
    if (!isFinite(numericValue) || isNaN(numericValue)) {
      setAnimatedValue(0);
      return;
    }
    
    const duration = 1000; // 1 segundo
    const steps = 60;
    const increment = numericValue / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= numericValue) {
        setAnimatedValue(numericValue);
        clearInterval(timer);
      } else {
        setAnimatedValue(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, loading]);

  // Configuración de colores por variante
  const getColorClasses = () => {
    const baseColors = {
      blue: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
        gradient: 'from-blue-500 to-blue-600',
        progress: 'bg-blue-500',
        hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/30'
      },
      green: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        text: 'text-green-600 dark:text-green-400',
        border: 'border-green-200 dark:border-green-800',
        gradient: 'from-green-500 to-green-600',
        progress: 'bg-green-500',
        hover: 'hover:bg-green-100 dark:hover:bg-green-900/30'
      },
      yellow: {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        text: 'text-yellow-600 dark:text-yellow-400',
        border: 'border-yellow-200 dark:border-yellow-800',
        gradient: 'from-yellow-500 to-yellow-600',
        progress: 'bg-yellow-500',
        hover: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
      },
      red: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        text: 'text-red-600 dark:text-red-400',
        border: 'border-red-200 dark:border-red-800',
        gradient: 'from-red-500 to-red-600',
        progress: 'bg-red-500',
        hover: 'hover:bg-red-100 dark:hover:bg-red-900/30'
      },
      purple: {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        text: 'text-purple-600 dark:text-purple-400',
        border: 'border-purple-200 dark:border-purple-800',
        gradient: 'from-purple-500 to-purple-600',
        progress: 'bg-purple-500',
        hover: 'hover:bg-purple-100 dark:hover:bg-purple-900/30'
      },
      indigo: {
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        text: 'text-indigo-600 dark:text-indigo-400',
        border: 'border-indigo-200 dark:border-indigo-800',
        gradient: 'from-indigo-500 to-indigo-600',
        progress: 'bg-indigo-500',
        hover: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
      },
      pink: {
        bg: 'bg-pink-50 dark:bg-pink-900/20',
        text: 'text-pink-600 dark:text-pink-400',
        border: 'border-pink-200 dark:border-pink-800',
        gradient: 'from-pink-500 to-pink-600',
        progress: 'bg-pink-500',
        hover: 'hover:bg-pink-100 dark:hover:bg-pink-900/30'
      },
      orange: {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        text: 'text-orange-600 dark:text-orange-400',
        border: 'border-orange-200 dark:border-orange-800',
        gradient: 'from-orange-500 to-orange-600',
        progress: 'bg-orange-500',
        hover: 'hover:bg-orange-100 dark:hover:bg-orange-900/30'
      }
    };

    return baseColors[color];
  };

  const colors = getColorClasses();

  // Configuración de tamaños
  const sizeClasses = {
    sm: {
      card: 'p-4',
      icon: 'h-5 w-5',
      iconContainer: 'p-2',
      title: 'text-xs',
      value: 'text-lg',
      change: 'text-xs'
    },
    md: {
      card: 'p-6',
      icon: 'h-6 w-6',
      iconContainer: 'p-3',
      title: 'text-sm',
      value: 'text-2xl',
      change: 'text-sm'
    },
    lg: {
      card: 'p-8',
      icon: 'h-8 w-8',
      iconContainer: 'p-4',
      title: 'text-base',
      value: 'text-3xl',
      change: 'text-base'
    }
  };

  const sizeConfig = sizeClasses[size];

  // Configuración de variantes
  const getVariantClasses = () => {
    switch (variant) {
      case 'gradient':
        return `bg-gradient-to-br ${colors.gradient} text-white shadow-lg`;
      case 'minimal':
        return 'bg-transparent border-0 shadow-none';
      case 'outlined':
        return `bg-transparent border-2 ${colors.border} ${colors.hover}`;
      default:
        return `bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 ${onClick ? colors.hover : ''}`;
    }
  };

  // Formatear valor animado
  const formatAnimatedValue = () => {
    if (loading || !isFinite(animatedValue) || isNaN(animatedValue)) {
      return typeof value === 'string' ? value : '0';
    }
    
    if (typeof value === 'string' && value.includes('$')) {
      return `$${animatedValue.toFixed(2)}`;
    }
    
    return Math.round(animatedValue).toLocaleString();
  };

  // Renderizar tendencia mini
  const renderMiniTrend = () => {
    if (trend.length < 2) return null;
    
    // Filtrar valores válidos y convertir a números
    const validTrend = trend.filter(val => typeof val === 'number' && !isNaN(val) && isFinite(val));
    if (validTrend.length < 2) return null;
    
    const minVal = Math.min(...validTrend);
    const maxVal = Math.max(...validTrend);
    
    // Evitar división por cero
    const range = maxVal - minVal;
    if (range === 0) return null;
    
    const points = validTrend.map((val, idx) => {
      const x = (idx / (validTrend.length - 1)) * 60;
      const y = 20 - ((val - minVal) / range) * 15;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg className="w-16 h-6 ml-2" viewBox="0 0 60 20">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          points={points}
          className={change?.positive ? 'text-green-500' : 'text-red-500'}
        />
      </svg>
    );
  };

  // Renderizar barra de progreso
  const renderProgress = () => {
    if (!showProgress) return null;
    
    const percentage = target ? (progressValue / target) * 100 : progressValue;
    
    return (
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
          <span>Progreso</span>
          <span>{percentage.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-1000 ease-out ${colors.progress}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        {target && (
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>{progressValue.toLocaleString()}</span>
            <span>Meta: {target.toLocaleString()}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative group">
      <div
        className={`
          rounded-lg transition-all duration-300 transform
          ${getVariantClasses()}
          ${sizeConfig.card}
          ${onClick ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : ''}
          ${loading ? 'animate-pulse' : ''}
        `}
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-80 rounded-lg flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center">
              <p className={`font-medium ${sizeConfig.title} ${
                variant === 'gradient' ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'
              }`}>
                {title}
              </p>
              {description && (
                <button className="ml-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <Info className="h-3 w-3" />
                </button>
              )}
            </div>
            {subtitle && (
              <p className={`text-xs mt-1 ${
                variant === 'gradient' ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {subtitle}
              </p>
            )}
          </div>

          {/* Menú de opciones */}
          {(onAction || onClick) && (
            <div className="flex items-center space-x-1">
              {onClick && (
                <button className={`p-1 rounded hover:bg-black/10 ${
                  variant === 'gradient' ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-gray-600'
                }`}>
                  <Eye className="h-3 w-3" />
                </button>
              )}
              {onAction && (
                <button className={`p-1 rounded hover:bg-black/10 ${
                  variant === 'gradient' ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-gray-600'
                }`}>
                  <MoreHorizontal className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Contenido principal */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-end">
              <p className={`font-bold ${sizeConfig.value} ${
                variant === 'gradient' ? 'text-white' : 'text-gray-900 dark:text-white'
              }`}>
                {loading ? '---' : formatAnimatedValue()}
              </p>
              {renderMiniTrend()}
            </div>

            {/* Cambio porcentual */}
            {change && !loading && (
              <div className="flex items-center mt-2">
                <div className={`flex items-center ${sizeConfig.change} font-medium ${
                  change.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {change.positive ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : change.value === 0 ? (
                    <Minus className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {change.positive ? '+' : ''}{change.value}%
                </div>
                {change.period && (
                  <span className={`ml-2 ${sizeConfig.change} ${
                    variant === 'gradient' ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    vs {change.period}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Icono */}
          <div className={`${sizeConfig.iconContainer} rounded-full ${
            variant === 'gradient' ? 'bg-white/20' : colors.bg
          }`}>
            <Icon className={`${sizeConfig.icon} ${
              variant === 'gradient' ? 'text-white' : colors.text
            }`} />
          </div>
        </div>

        {/* Barra de progreso */}
        {renderProgress()}

        {/* Botón de acción */}
        {actionLabel && onAction && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
            className={`mt-4 w-full py-2 px-3 text-xs font-medium rounded-md transition-colors ${
              variant === 'gradient'
                ? 'bg-white/20 text-white hover:bg-white/30'
                : `${colors.bg} ${colors.text} hover:${colors.hover}`
            }`}
          >
            {actionLabel}
          </button>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && description && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-10">
          {description}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
        </div>
      )}
    </div>
  );
};