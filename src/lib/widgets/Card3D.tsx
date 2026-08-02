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
    sm: 'border-b-2',
    md: 'border-b-2',
    lg: 'border-b-2'
  };

  return (
    <div 
      className={cn(
        "relative flex flex-col rounded-[24px] border-2 bg-white",
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
