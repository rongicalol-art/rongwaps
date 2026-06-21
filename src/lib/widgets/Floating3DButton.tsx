import React, { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface Floating3DButtonProps extends React.ComponentProps<'button'> {
  colorClass?: string;
  icon?: ReactNode;
  iconOffset?: string;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export function Floating3DButton({ 
  className, 
  colorClass = 'bg-brand-primary', 
  icon,
  iconOffset = 'ml-1', // Default offset for play icons to optically center them
  ...props 
}: Floating3DButtonProps) {
  return (
    <button 
      className={cn(
        "relative w-14 h-14 rounded-full text-white flex items-center justify-center transition-all duration-75 hover:scale-105 active:translate-y-[6px] active:border-b-0 active:shadow-none focus:outline-none group",
        colorClass,
        "border-b-[6px] border-black/25", // Solid 3D shadow block
        "shadow-[0_8px_16px_rgba(0,0,0,0.2)]", // Drop shadow
        className
      )}
      {...props}
    >
      <div className={cn("group-hover:scale-110 transition-transform flex items-center justify-center", iconOffset)}>
        {icon}
      </div>
    </button>
  );
}
