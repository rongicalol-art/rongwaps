import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../utils/cn';
import { AppIcon } from './AppIcon';
import { IconActionButton } from './IconActionButton';
import { StudyPartProgressRail } from './PartProgressRail';
import type { CourseLessonPartProgress, PartSegment } from '../../types/models';
import { visibleProgressWidth } from '../../utils/progress';

/**
 * Chrome treatments for `ScreenHeader`:
 * - `bar`   — bordered surface bar with a fixed height; used by screens in
 *             normal workspace flow.
 * - `window` — the canonical sticky canvas fade for full-viewport study
 *             windows (Grammar, Reader, practice activities). Its row carries a
 *             small inner inset that matches those windows' content offsets.
 * - `panel` — the same fade with a flush row, for workspace-bounded detail
 *             windows (word detail, character breakdown).
 */
export type ScreenHeaderVariant = 'bar' | 'window' | 'panel';

/** Canvas that a sticky fade variant blends into. Mirrors `LoadingScreen`'s tone. */
export type ScreenHeaderTone = 'canvas' | 'practice';

const FADE_TONE_CLASSES: Record<ScreenHeaderTone, string> = {
  canvas: 'from-ui-canvas via-ui-canvas/95',
  practice: 'from-ui-practice-canvas via-ui-practice-canvas/95',
};

export interface ScreenHeaderProps {
  title?: string;
  eyebrow?: string;
  centerContent?: React.ReactNode;
  progress?: number;
  currentIndex?: number;
  totalCount?: number;
  partSegments?: PartSegment[];
  studyParts?: CourseLessonPartProgress[];
  onSelectStudyPart?: (partId: number) => void;
  onToggleStudyPart?: (partId: number) => void;
  onClose?: () => void;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  accentBgClassName?: string;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'none';
  progressSize?: 'default' | 'compact';
  controlSize?: 'sm' | 'md' | 'lg';
  /**
   * Chrome treatment. Defaults to `bar`, which is the header's own surface
   * chrome; sticky window headers must select `window` or `panel` explicitly
   * instead of smuggling the fade recipe through `className`.
   */
  variant?: ScreenHeaderVariant;
  /** Canvas a sticky fade variant blends into. Ignored by `bar`. */
  tone?: ScreenHeaderTone;
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
  onSelectStudyPart,
  onToggleStudyPart,
  onClose, 
  onBack, 
  rightAction,
  accentBgClassName = "bg-brand-primary",
  className = "",
  maxWidth = '2xl',
  progressSize = 'default',
  controlSize = 'md',
  variant = 'bar',
  tone = 'canvas',
}: ScreenHeaderProps) {
  const controlMetrics = {
    sm: { controlSize: 'sm' as const, iconSize: 18, sideSpacerClassName: 'w-9' },
    md: { controlSize: 'md' as const, iconSize: 20, sideSpacerClassName: 'w-10' },
    lg: { controlSize: 'lg' as const, iconSize: 25, sideSpacerClassName: 'w-11' },
  }[controlSize];
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    none: 'max-w-none',
  };
  const usesStudyPartRail = studyParts.length > 1 && Boolean(onSelectStudyPart && onToggleStudyPart);

  const headerRow = (
    <div className={cn("w-full flex items-center justify-between mx-auto", maxWidthClasses[maxWidth])}>
      {onClose ? (
        <IconActionButton
          onClick={onClose}
          className="relative z-30 -ml-1"
          label="Close"
          size={controlMetrics.controlSize}
          icon={<AppIcon name="close" size={controlMetrics.iconSize} />}
        />
      ) : onBack ? (
        <IconActionButton
          onClick={onBack}
          className="relative z-30 -ml-1"
          label="Go back"
          size={controlMetrics.controlSize}
          icon={<AppIcon name="back" size={controlMetrics.iconSize} />}
        />
      ) : (
        <div className={controlMetrics.sideSpacerClassName} />
      )}
      
      <div className={cn("flex-1 mx-2 md:mx-4 flex items-center", eyebrow ? "justify-start" : "justify-center")}>
        {centerContent !== undefined ? (
          centerContent
        ) : progress !== undefined ? (
          <div className="w-full flex items-center justify-center">
            {studyParts.length > 1 && onSelectStudyPart && onToggleStudyPart ? (
              <StudyPartProgressRail
                parts={studyParts}
                onSelectPart={onSelectStudyPart}
                onTogglePart={onToggleStudyPart}
                segments={partSegments}
                currentIndex={currentIndex ?? 0}
                totalCount={totalCount ?? 0}
                density={progressSize === 'compact' ? 'compact' : 'default'}
                className="w-full"
              />
            ) : (
              <div className={cn(
                "relative h-5 w-full overflow-hidden rounded-full bg-brand-primary-track",
              )}>
                <motion.div
                  className={`absolute bottom-0 left-0 top-0 min-w-0 overflow-hidden rounded-full ${accentBgClassName} will-change-[width]`}
                  initial={{ width: 0 }}
                  animate={{ width: visibleProgressWidth(progress) }}
                  transition={{ type: 'spring', stiffness: 280, damping: 32, mass: 0.7 }}
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
              "w-full text-center text-xs sm:text-sm font-black uppercase tracking-wider text-ui-ink-strong",
            )}>
              {title}
            </h1>
          )
        ) : null}
      </div>

      <div className="flex h-10 shrink-0 items-center gap-2">
        {(currentIndex !== undefined && totalCount !== undefined && totalCount > 0 && !usesStudyPartRail) && (
          <span className="mt-0.5 text-xs font-extrabold tracking-wider text-ui-muted tabular-nums sm:text-sm sm:tracking-widest">
            {currentIndex + 1} / {totalCount}
          </span>
        )}
        {rightAction !== undefined ? (
          rightAction
        ) : (
          <span aria-hidden="true" className={controlMetrics.sideSpacerClassName} />
        )}
      </div>
    </div>
  );

  if (variant !== 'bar') {
    // Sticky window header: the wrapper owns the canvas fade and the safe-area
    // inset, while the inner header stays transparent so scrolled content
    // slides under the gradient.
    return (
      <div
        className={cn(
          "sticky top-0 z-30 flex w-full origin-top flex-col items-center pb-2 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] backdrop-blur-[2px]",
          "bg-gradient-to-b to-transparent",
          FADE_TONE_CLASSES[tone],
          className,
        )}
      >
        <header className={cn(
          "relative z-10 w-full shrink-0 pointer-events-auto px-4 sm:px-6 lg:px-10",
          variant === 'window' && "py-1",
        )}>
          {headerRow}
        </header>
      </div>
    );
  }

  return (
    <header className={cn(
      "relative z-10 w-full shrink-0 pointer-events-auto",
      "window-header border-b-2 border-ui-border bg-ui-surface px-3 py-3 shadow-sm md:px-5",
      className,
    )}>
      {headerRow}
    </header>
  );
}
