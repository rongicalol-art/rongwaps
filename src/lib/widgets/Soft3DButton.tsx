import React from 'react';
import { cn } from '../../utils/cn';

export interface Soft3DButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'locked' | 'custom';
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  depth?: 'sm' | 'md' | 'lg';
}

export function Soft3DButton({ variant = 'primary', children, className = '', disabled, depth = 'lg', ...props }: Soft3DButtonProps) {
  const depthClasses = {
    sm: 'border-b-2 active:translate-y-[3px]',
    md: 'border-b-2 active:translate-y-[4px]',
    lg: 'border-b-[6px] active:translate-y-[6px]',
  };
  const baseClasses = "w-full rounded-[24px] font-extrabold text-[15px] uppercase tracking-widest flex items-center justify-center gap-2 p-4 transition-all duration-75 outline-none hover:scale-[1.02] active:border-b-0";
  
  let colorClasses = "";
  
  const isLocked = variant === 'locked' || disabled;

  if (variant === 'primary') {
    colorClasses = "bg-brand-primary border-brand-primary-edge text-white hover:brightness-105";
  } else if (variant === 'secondary') {
    colorClasses = "bg-brand-secondary border-brand-secondary-edge text-white hover:brightness-105";
  } else if (isLocked) {
    colorClasses = "bg-brand-disabled border-brand-disabled-edge text-brand-text-secondary cursor-not-allowed";
  } else if (variant === 'custom') {
    colorClasses = "hover:brightness-105";
  }

  return (
    <button 
      className={cn(baseClasses, depthClasses[depth], colorClasses, className)}
      disabled={isLocked}
      {...props}
    >
      {children}
    </button>
  );
}
