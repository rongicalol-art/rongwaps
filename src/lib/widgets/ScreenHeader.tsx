import React from 'react';
import { motion } from 'motion/react';
import { PiXBold, PiArrowLeftBold, PiGearFill } from 'react-icons/pi';
import { cn } from '../../utils/cn';
import { IconButton3D } from './IconButton3D';

export interface ScreenHeaderProps {
  title?: string;
  progress?: number;
  currentIndex?: number;
  totalCount?: number;
  onClose?: () => void;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  accentBgClassName?: string;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'none';
  compact?: boolean;
}

export function ScreenHeader({ 
  title, 
  progress, 
  currentIndex, 
  totalCount, 
  onClose, 
  onBack, 
  rightAction,
  accentBgClassName = "bg-brand-primary",
  className = "",
  maxWidth = '2xl',
  compact = false
}: ScreenHeaderProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    none: 'max-w-none',
  };

  const actionButtonClass = compact
    ? "p-1.5 text-[#AFB6BB] hover:text-[#4B4B4B] hover:scale-105 active:scale-95 transition-all shrink-0 relative z-30"
    : "p-2 text-[#AFB6BB] hover:text-[#4B4B4B] hover:scale-105 active:scale-95 transition-all shrink-0 relative z-30";

  return (
    <header className={cn(
      "w-full bg-white border-b-[3px] border-[#E5E5E5] shadow-sm shrink-0 relative z-10 pointer-events-auto px-4 md:px-6 transition-all duration-200 ease-out",
      compact ? "py-2" : "py-4",
      className
    )}>
      <div className={cn("w-full flex items-center justify-between mx-auto", maxWidthClasses[maxWidth])}>
        {onClose ? (
          <button onClick={onClose} className={cn(actionButtonClass, "-ml-2")} aria-label="Close">
            <PiXBold size={compact ? 24 : 28} />
          </button>
        ) : onBack ? (
          <button onClick={onBack} className={cn(actionButtonClass, "-ml-2")} aria-label="Go back">
             <PiArrowLeftBold size={compact ? 24 : 28} />
          </button>
        ) : (
          <div className={compact ? "w-9" : "w-10"}></div>
        )}
        
        <div className="flex-1 mx-4 md:mx-6 flex items-center justify-center">
          {progress !== undefined ? (
            <div className={cn("w-full relative rounded-full bg-[#E5E5E5] transition-all duration-200", compact ? "h-2.5" : "h-4")}>
              <motion.div 
                className={`absolute left-0 top-0 bottom-0 ${accentBgClassName} rounded-full overflow-hidden`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                style={{ minWidth: progress > 0 ? '24px' : '0px' }}
                transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
              >
                  {progress > 0 && (
                    <div className="absolute top-[3px] left-[6px] right-[6px] h-[4px] bg-white opacity-30 rounded-full" />
                  )}
              </motion.div>
            </div>
          ) : title ? (
            <h1 className={cn(
              "font-black text-[#4B4B4B] opacity-40 text-center uppercase tracking-widest w-full transition-all duration-200",
              compact ? "text-[12px] sm:text-[13px]" : "text-[15px] sm:text-[17px]"
            )}>
              {title}
            </h1>
          ) : null}
        </div>

        <div className={cn("flex items-center gap-3 shrink-0 transition-all duration-200", compact ? "h-8" : "h-10")}>
          {(currentIndex !== undefined && totalCount !== undefined) && (
            <span className={cn("font-extrabold text-[#AFB6BB] tracking-widest tabular-nums mt-0.5 transition-all duration-200", compact ? "text-xs" : "text-sm")}>
              {currentIndex + 1} / {totalCount}
            </span>
          )}
          {rightAction !== undefined ? (
            rightAction
          ) : (
            <button className={cn(actionButtonClass, "-mr-2")}>
              <PiGearFill size={compact ? 24 : 28} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
