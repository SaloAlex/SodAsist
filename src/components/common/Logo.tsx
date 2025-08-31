import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12',
    xl: 'h-16',
    '2xl': 'h-20'
  };

    return (
    <div className={`flex items-center justify-center ${className}`}>
      <img 
        src="/Logo.png" 
        alt="VaListo" 
        className={`${sizeClasses[size]} w-auto`} 
      />
    </div>
  );
};
