import React from 'react';
import { cn } from '../../utils/cn';

export interface Soft3DButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'locked' | 'custom';
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export function Soft3DButton({ variant = 'primary', children, className = '', disabled, ...props }: Soft3DButtonProps) {
  const baseClasses = "w-full rounded-[24px] font-extrabold text-[15px] uppercase tracking-widest flex items-center justify-center gap-2 p-4 transition-all duration-75 outline-none hover:scale-[1.02]";
  
  let colorClasses = "";
  
  const isLocked = variant === 'locked' || disabled;

  if (variant === 'primary') {
    colorClasses = "bg-brand-primary border-b-[6px] border-brand-primary-edge text-white hover:brightness-105 active:border-b-0 active:translate-y-[6px]";
  } else if (variant === 'secondary') {
    colorClasses = "bg-brand-secondary border-b-[6px] border-brand-secondary-edge text-white hover:brightness-105 active:border-b-0 active:translate-y-[6px]";
  } else if (isLocked) {
    colorClasses = "bg-brand-disabled border-b-[6px] border-brand-disabled-edge text-brand-text-secondary cursor-not-allowed";
  } else if (variant === 'custom') {
    colorClasses = "border-b-[6px] hover:brightness-105 active:border-b-0 active:translate-y-[6px]";
  }

  return (
    <button 
      className={cn(baseClasses, colorClasses, className, isLocked ? '' : '')}
      disabled={isLocked}
      {...props}
    >
      {children}
    </button>
  );
}
