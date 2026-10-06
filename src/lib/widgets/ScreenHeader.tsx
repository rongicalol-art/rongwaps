import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../utils/cn';
import { AppIcon } from './AppIcon';
import { IconActionButton } from './IconActionButton';
import { StudyPartProgressRail } from './part-progress';
import type { CourseLessonPartProgress, PartSegment } from '../../types/models';
import { visibleProgressWidth } from '../../utils/progress';

/**
 * Chrome treatments for `ScreenHeader`:
 * - `bar`   — bordered surface bar with a fixed height; used by screens in
 *             normal workspace flow and by Reading Mode's flat brand bar.
 * - `window` — the canonical sticky canvas fade for full-viewport study
 *             windows (Grammar, Reader, practice activities). Its row carries a
 *             small inner inset that matches those windows' content offsets.
 * - `panel` — the same fade and row padding, for workspace-bounded detail
 *             windows (word detail, character breakdown).
 * - `frosted` — tone-matched translucent bar with a backdrop blur, the
 *             universal 2px `ui-border` edge, and the standard window-header
 *             height; Reading Mode's header. Content scrolls under it without
 *             showing through, so the consumer must overlay it (and pad the
 *             scroller clear of it).
 */
export type ScreenHeaderVariant = 'bar' | 'window' | 'panel' | 'frosted';

/** Canvas that a sticky fade variant blends into. Mirrors `LoadingScreen`'s tone. */
export type ScreenHeaderTone = 'canvas' | 'practice';

const FADE_TONE_CLASSES: Record<ScreenHeaderTone, string> = {
  canvas: 'from-ui-canvas via-ui-canvas/95',
  practice: 'from-ui-practice-canvas via-ui-practice-canvas/95',
};

const FROST_TONE_CLASSES: Record<ScreenHeaderTone, string> = {
  canvas: 'bg-ui-canvas/95',
  practice: 'bg-ui-practice-canvas/95',
};

export interface ScreenHeaderProps {
  title?: string;
  eyebrow?: string;
  leftContent?: React.ReactNode;
  centerContent?: React.ReactNode;
  progress?: number;
  showPercentage?: boolean;
  currentIndex?: number;
  totalCount?: number;
  isRetry?: boolean;
  cleanupPhase?: { currentIndex: number; totalCount: number } | null;
  partSegments?: PartSegment[];
  studyParts?: CourseLessonPartProgress[];
  onSelectStudyPart?: (partId: number) => void;
  onToggleStudyPart?: (partId: number) => void;
  onClose?: () => void;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  /** Theme color for the close icon (defaults to the muted neutral). */
  closeIconColor?: string;
  closeIconClassName?: string;
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
  leftContent,
  centerContent,
  progress, 
  showPercentage = false,
  currentIndex, 
  totalCount, 
  isRetry = false,
  cleanupPhase = null,
  partSegments = [],
  studyParts = [],
  onSelectStudyPart,
  onToggleStudyPart,
  onClose, 
  onBack, 
  rightAction,
  closeIconColor,
  closeIconClassName,
  accentBgClassName = "bg-brand-primary",
  className = "",
  maxWidth = 'none',
  progressSize = 'default',
  controlSize = 'lg',
  variant = 'bar',
  tone = 'canvas',
}: ScreenHeaderProps) {
  const controlMetrics = {
    sm: { controlSize: 'sm' as const, iconSize: 18, sideSpacerClassName: 'w-9', containerHeightClassName: 'h-9' },
    md: { controlSize: 'md' as const, iconSize: 20, sideSpacerClassName: 'w-10', containerHeightClassName: 'h-10' },
    lg: { controlSize: 'lg' as const, iconSize: 25, sideSpacerClassName: 'w-11', containerHeightClassName: 'h-11' },
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
  const usesStudyPartRail = studyParts.length > 1 && onSelectStudyPart !== undefined && onToggleStudyPart !== undefined && partSegments.length > 0;
  const hasCenteredContent = progress === undefined && !eyebrow && (centerContent !== undefined || Boolean(title));
  const effectiveAccentBg = cleanupPhase ? 'bg-feedback-warning' : accentBgClassName;
  const effectiveTotalCount = cleanupPhase ? cleanupPhase.totalCount : totalCount;
  const effectiveCurrentIndex = cleanupPhase ? cleanupPhase.currentIndex : currentIndex;

  const headerRow = (
    <div className={cn("relative w-full flex items-center justify-between mx-auto", maxWidthClasses[maxWidth])}>
      <div className="relative z-20 flex shrink-0 items-center gap-2">
        {onClose ? (
          <IconActionButton
            onClick={onClose}
            className="-ml-1"
            label="Close"
            size={controlMetrics.controlSize}
            icon={<AppIcon name="close" size={controlMetrics.iconSize} color={closeIconColor} className={closeIconClassName} />}
          />
        ) : onBack ? (
          <IconActionButton
            onClick={onBack}
            className="-ml-1"
            label="Go back"
            size={controlMetrics.controlSize}
            icon={<AppIcon name="back" size={controlMetrics.iconSize} />}
          />
        ) : (
          <div className={controlMetrics.sideSpacerClassName} />
        )}
        {leftContent}
        {title && progress !== undefined && (
          <span className="hidden truncate text-sm font-black text-ui-ink-strong sm:inline sm:text-base max-w-56 md:max-w-xs lg:max-w-md whitespace-nowrap">
            {title}
          </span>
        )}
      </div>

      {hasCenteredContent ? (
        <>
          <div className="flex-1" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-14 sm:px-24">
            <div className="pointer-events-auto min-w-0 max-w-full flex items-center justify-center">
              {centerContent !== undefined ? (
                centerContent
              ) : (
                <h1 className={cn(
                  "truncate text-base font-black text-ui-ink-strong sm:text-lg",
                  /[\u3400-\u9FFF]/.test(title!) ? "font-chinese" : "font-sans",
                )}>
                  {title}
                </h1>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className={cn("flex-1 mx-2 md:mx-4 flex items-center", eyebrow ? "justify-start" : "justify-center")}>
          {progress !== undefined ? (
            <div className="w-full flex items-center justify-center gap-3">
              {usesStudyPartRail ? (
                <StudyPartProgressRail
                  parts={studyParts}
                  onSelectPart={onSelectStudyPart}
                  onTogglePart={onToggleStudyPart}
                  segments={partSegments}
                  currentIndex={effectiveCurrentIndex ?? currentIndex ?? 0}
                  totalCount={effectiveTotalCount ?? totalCount ?? 0}
                  isRetry={isRetry || Boolean(cleanupPhase)}
                  density={progressSize === 'compact' ? 'compact' : 'default'}
                  className="w-full"
                />
              ) : (effectiveTotalCount !== undefined && effectiveTotalCount > 0 && effectiveTotalCount <= 4) ? (
                <div
                  className={cn(
                    "flex w-full items-center justify-center gap-2",
                    effectiveTotalCount === 1 ? "max-w-28" : effectiveTotalCount === 2 ? "max-w-48" : "max-w-64"
                  )}
                  aria-label={
                    cleanupPhase
                      ? `Review: ${cleanupPhase.currentIndex + 1} of ${cleanupPhase.totalCount}`
                      : isRetry
                      ? `Review: ${Math.min((effectiveCurrentIndex ?? 0) + 1, effectiveTotalCount)} of ${effectiveTotalCount}`
                      : `Progress: ${Math.min((effectiveCurrentIndex ?? 0) + 1, effectiveTotalCount)} of ${effectiveTotalCount}`
                  }
                >
                  {Array.from({ length: effectiveTotalCount }).map((_, idx) => {
                    const isPassedOrCurrent = idx <= (effectiveCurrentIndex ?? 0);
                    return (
                      <div
                        key={idx}
                        className="relative h-5 flex-1 min-w-9 overflow-hidden rounded-full bg-brand-primary-track"
                      >
                        <motion.div
                          className={`absolute inset-0 overflow-hidden rounded-full ${effectiveAccentBg} will-change-[transform,opacity]`}
                          initial={false}
                          animate={{
                            scaleX: isPassedOrCurrent ? 1 : 0,
                            opacity: isPassedOrCurrent ? 1 : 0,
                          }}
                          style={{ originX: 0 }}
                          transition={{ type: 'spring', stiffness: 280, damping: 32, mass: 0.7 }}
                        >
                          <div className="absolute left-2 right-2 top-1 h-1.5 rounded-full bg-white/30" />
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="relative h-5 w-full overflow-hidden rounded-full bg-brand-primary-track">
                  <motion.div
                    className={`absolute bottom-0 left-0 top-0 min-w-0 overflow-hidden rounded-full ${effectiveAccentBg} will-change-[width]`}
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
              {showPercentage && (
                <span className="shrink-0 text-xs font-extrabold text-ui-muted tabular-nums sm:text-sm">
                  {Math.round(progress)}%
                </span>
              )}
            </div>
          ) : title ? (
            <div className="min-w-0 text-left">
              <p className="truncate text-[9px] font-black uppercase tracking-[0.08em] text-brand-primary sm:text-[10px]">{eyebrow}</p>
              <h1 className={cn(
                "truncate text-base font-black text-ui-ink sm:text-lg",
                /[\u3400-\u9FFF]/.test(title) ? "font-chinese" : "font-sans",
              )}>
                {title}
              </h1>
            </div>
          ) : null}
        </div>
      )}

      <div className={cn("relative z-20 flex shrink-0 items-center gap-2", controlMetrics.containerHeightClassName)}>
        {!usesStudyPartRail && (
          (isRetry || cleanupPhase) ? (
            <span className="mt-0.5 text-xs font-extrabold tracking-wider text-feedback-warning-edge sm:text-sm sm:tracking-widest">
              Again
            </span>
          ) : (
            (currentIndex !== undefined && totalCount !== undefined && totalCount > 0) && (
              <span className="mt-0.5 text-xs font-extrabold tracking-wider text-ui-muted tabular-nums sm:text-sm sm:tracking-widest">
                {currentIndex + 1} / {totalCount}
              </span>
            )
          )
        )}
        {rightAction !== undefined ? (
          rightAction
        ) : (
          <span aria-hidden="true" className={controlMetrics.sideSpacerClassName} />
        )}
      </div>
    </div>
  );

  if (variant === 'frosted') {
    // Frosted window header: translucent canvas tone + blur hide the content
    // sliding beneath, and the universal 2px border edge closes the bar. The
    // row keeps the standard window-header height so every study window's
    // chrome lines up. Positioning stays with the consumer (Reading Mode
    // overlays it on the reading column), and the bar carries no shadow.
    return (
      <div
        className={cn(
          'flex w-full origin-top flex-col items-center justify-center border-b-2 border-ui-border pt-[env(safe-area-inset-top,0px)] backdrop-blur-md',
          'min-h-[calc(var(--size-window-header)+env(safe-area-inset-top,0px))]',
          FROST_TONE_CLASSES[tone],
          className,
        )}
      >
        <header className="relative z-10 w-full shrink-0 pointer-events-auto px-3 sm:px-6 lg:px-10">
          {headerRow}
        </header>
      </div>
    );
  }


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
          "relative z-10 w-full shrink-0 pointer-events-auto px-4 py-1 sm:px-6 lg:px-10",
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
