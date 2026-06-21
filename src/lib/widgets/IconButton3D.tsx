import React from 'react';
import { cn } from '../../utils/cn';

export interface IconButton3DProps extends React.ComponentProps<'button'> {
  icon: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  variant?: 'neutral' | 'primary' | 'danger' | 'success' | 'custom';
  customColors?: {
    bg: string;
    text: string;
    border: string;
    hoverBg?: string;
  };
  size?: 'sm' | 'md' | 'lg';
}

export function IconButton3D({ 
  icon, 
  variant = 'neutral', 
  customColors,
  size = 'md',
  className = '', 
  ...props 
}: IconButton3DProps) {
  const sizeClasses = {
    sm: 'w-10 h-10 rounded-[12px] p-2',
    md: 'w-12 h-12 rounded-[16px] p-2',
    lg: 'w-14 h-14 rounded-[20px] p-3'
  };

  let colorClasses = '';

  if (variant === 'neutral') {
    colorClasses = "bg-white text-[#AFB6BB] border-[#E5E5E5] hover:bg-[#F7F7F7] hover:text-[#4B4B4B]";
  } else if (customColors) {
    colorClasses = `${customColors.bg} ${customColors.text} ${customColors.border} hover:brightness-105`;
  }

  return (
    <button 
      className={cn(
        "flex flex-col items-center justify-center transition-all border-[2px] border-b-[6px] hover:scale-105 active:border-b-[0] active:translate-y-[6px] shrink-0",
        sizeClasses[size],
        colorClasses,
        className
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
