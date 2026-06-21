import React from 'react';

export function GlassCard({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={`bg-white border-[3px] border-b-[6px] border-[#E5E5E5] rounded-[24px] overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
