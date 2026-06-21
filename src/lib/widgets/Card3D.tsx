import React from 'react';
import { cn } from '../../utils/cn';

export interface Card3DProps extends React.ComponentProps<'div'> {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  key?: React.Key;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  edgeColor?: string;
  shadowColor?: string;
  depth?: 'sm' | 'md' | 'lg';
}

export function Card3D({ 
  children, 
  className = '', 
  edgeColor = 'border-[#E5E5E5]', 
  depth = 'lg',
  ...props 
}: Card3DProps) {
  const depthClasses = {
    sm: 'border-b-[3px]',
    md: 'border-b-[4px]',
    lg: 'border-b-[6px]'
  };

  return (
    <div 
      className={cn(
        "bg-white rounded-[24px] border-[3px] flex flex-col shadow-sm relative",
        edgeColor,
        depthClasses[depth],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
