import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../utils/cn';
import { AppIcon } from './AppIcon';
import { IconActionButton } from './IconActionButton';
import { PracticePartProgressRail, StudyPartProgressRail } from './PartProgressRail';
import type { CourseLessonPartProgress, PartSegment } from '../../types/models';
import { visibleProgressWidth } from '../../utils/progress';

export interface ScreenHeaderProps {
  title?: string;
  eyebrow?: string;
  centerContent?: React.ReactNode;
  progress?: number;
  currentIndex?: number;
  totalCount?: number;
  partSegments?: PartSegment[];
  studyParts?: CourseLessonPartProgress[];
  onToggleStudyPart?: (partId: number) => void;
  onClose?: () => void;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  accentBgClassName?: string;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'none';
  progressSize?: 'default' | 'compact';
}

export function ScreenHeader({ 
  title, 
  eyebrow,
  centerContent,
  progress, 
  currentIndex, 
  totalCount, 
  partSegments = [],
  studyParts = [],
  onToggleStudyPart,
  onClose, 
  onBack, 
  rightAction,
  accentBgClassName = "bg-brand-primary",
  className = "",
  maxWidth = '2xl',
  progressSize = 'default',
}: ScreenHeaderProps) {
  const metrics = { controlSize: 'lg' as const, iconSize: 25, sideSpacerClassName: 'w-11' };
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    none: 'max-w-none',
  };

  return (
    <header className={cn(
      "window-header relative z-10 w-full shrink-0 border-b-2 border-ui-border bg-ui-surface px-3 py-3 shadow-sm pointer-events-auto md:px-5",
      className
    )}>
      <div className={cn("w-full flex items-center justify-between mx-auto", maxWidthClasses[maxWidth])}>
        {onClose ? (
          <IconActionButton
            onClick={onClose}
            className="relative z-30 -ml-1"
            label="Close"
            size={metrics.controlSize}
            icon={<AppIcon name="close" size={metrics.iconSize} />}
          />
        ) : onBack ? (
          <IconActionButton
            onClick={onBack}
            className="relative z-30 -ml-1"
            label="Go back"
            size={metrics.controlSize}
            icon={<AppIcon name="back" size={metrics.iconSize} />}
          />
        ) : (
          <div className={metrics.sideSpacerClassName} />
        )}
        
        <div className={cn("flex-1 mx-2 md:mx-4 flex items-center", eyebrow ? "justify-start" : "justify-center")}>
          {centerContent !== undefined ? (
            centerContent
          ) : progress !== undefined ? (
            <div className="w-full flex items-center justify-center">
              {studyParts.length > 1 && onToggleStudyPart ? (
                <StudyPartProgressRail
                  parts={studyParts}
                  onTogglePart={onToggleStudyPart}
                  segments={partSegments}
                  currentIndex={currentIndex ?? 0}
                  density={progressSize === 'compact' ? 'compact' : 'default'}
                  className="w-full"
                />
              ) : partSegments.length > 1 && currentIndex !== undefined && totalCount !== undefined ? (
                <PracticePartProgressRail
                  segments={partSegments}
                  currentIndex={currentIndex}
                  totalCount={totalCount}
                  density={progressSize === 'compact' ? 'compact' : 'default'}
                  className="w-full"
                />
              ) : (
                <div className={cn(
                  "relative h-5 w-full overflow-hidden rounded-full bg-ui-divider",
                )}>
                  <motion.div
                    className={`absolute left-0 top-0 bottom-0 ${accentBgClassName} rounded-full overflow-hidden`}
                    initial={{ width: 0 }}
                    animate={{ width: visibleProgressWidth(progress) }}
                    transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                  >
                    {progress > 0 && (
                      <div className="absolute left-2 right-2 top-1 h-1.5 rounded-full bg-white/30" />
                    )}
                  </motion.div>
                </div>
              )}
            </div>
          ) : title ? (
            eyebrow ? (
              <div className="min-w-0 text-left">
                <p className="truncate text-[9px] font-black uppercase tracking-[0.08em] text-brand-primary sm:text-[10px]">{eyebrow}</p>
                <h1 className={cn(
                  "truncate font-chinese text-base font-black text-ui-ink sm:text-lg",
                )}>
                  {title}
                </h1>
              </div>
            ) : (
              <h1 className={cn(
                "w-full text-center text-[15px] font-black uppercase tracking-widest text-ui-muted sm:text-[17px]",
              )}>
                {title}
              </h1>
            )
          ) : null}
        </div>

        <div className="flex h-10 shrink-0 items-center gap-2">
          {(currentIndex !== undefined && totalCount !== undefined && totalCount > 0) && (
            <span className="mt-0.5 text-sm font-extrabold tracking-widest text-ui-muted tabular-nums">
              {currentIndex + 1} / {totalCount}
            </span>
          )}
          {rightAction !== undefined ? (
            rightAction
          ) : (
            <span aria-hidden="true" className={metrics.sideSpacerClassName} />
          )}
        </div>
      </div>
    </header>
  );
}
