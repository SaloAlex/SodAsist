import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'yellow' | 'red';
  change?: {
    value: number;
    positive: boolean;
  };
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
  change
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
    green: 'bg-green-50 text-green-600 dark:bg-green-900 dark:text-green-300',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300',
    red: 'bg-red-50 text-red-600 dark:bg-red-900 dark:text-red-300'
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {change && (
            <p className={`text-sm font-medium ${
              change.positive ? 'text-green-600' : 'text-red-600'
            }`}>
              {change.positive ? '+' : ''}{change.value}%
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};