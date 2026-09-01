export interface CustomProgressBarProps {
  progress: number; // 0 to 100
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md';
  accentClassName?: string;
}

export function CustomProgressBar({
  progress,
  className = '',
  showText = false,
  size = 'md',
  accentClassName = 'bg-brand-primary',
}: CustomProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  return (
    <div className={`flex items-center gap-3 w-full ${className}`}>
      <div className={`${size === 'sm' ? 'h-2.5' : 'h-4'} w-full bg-brand-primary-track rounded-full flex-1 relative overflow-hidden`}>
        <div 
          className={`h-full ${accentClassName} rounded-full transition-all duration-500 ease-out relative`}
          style={{ width: `${clampedProgress}%`, minWidth: clampedProgress > 0 ? '24px' : '0px' }}
        >
          {clampedProgress > 0 && (
            <div className="absolute top-[3px] left-[6px] right-[6px] h-[4px] bg-white opacity-30 rounded-full" />
          )}
        </div>
      </div>
      {showText && (
        <span className="font-bold text-xs text-ui-muted w-8 text-right">
          {clampedProgress}%
        </span>
      )}
    </div>
  );
}
