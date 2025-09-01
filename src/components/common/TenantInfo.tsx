import React from 'react';
import { currentTenant } from '../../config/firebase';

export const TenantInfo: React.FC = () => {
  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
      <span className="font-medium">{currentTenant.name}</span>
      <span className="text-gray-400">•</span>
      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
        {currentTenant.projectId}
      </span>
    </div>
  );
};
