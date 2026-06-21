import React from 'react';
import { cn } from '../../utils/cn';

interface ScreenLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'none';
  children: React.ReactNode;
  className?: string;
}

export function ScreenLayout({ 
  maxWidth = 'xl', 
  children, 
  className, 
  ...props 
}: ScreenLayoutProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    none: 'max-w-none',
  };

  return (
    <div 
      className={cn(
        'flex-1 flex flex-col w-full mx-auto px-4 sm:px-6',
        maxWidthClasses[maxWidth],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
