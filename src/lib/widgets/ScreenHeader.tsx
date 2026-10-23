import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { cn } from '../../utils/cn';
import { AppIcon } from './AppIcon';
import { IconActionButton } from './IconActionButton';
import { StudyPartProgressRail } from './part-progress';
import type { CourseLessonPartProgress, PartSegment } from '../../types/models';
import { visibleProgressScale } from '../../utils/srs/progress';

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
  canvas: 'bg-ui-canvas',
  practice: 'bg-ui-practice-canvas',
};

/** 0–1 position of the pointer along the element it is attached to. */
function fractionFromPointer(e: React.PointerEvent<HTMLElement>): number {
  const rect = e.currentTarget.getBoundingClientRect();
  return rect.width > 0 ? Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) : 0;
}

export interface ScreenHeaderProps {
  title?: string;
  eyebrow?: string;
  leftContent?: React.ReactNode;
  centerContent?: React.ReactNode;
  progress?: number;
  /** Makes the progress rail a scrubber: called with 0–1 while dragging, then once on release or key press. */
  onProgressScrub?: (fraction: number) => void;
  onProgressSeek?: (fraction: number) => void;
  showPercentage?: boolean;
  currentIndex?: number;
  totalCount?: number;
  isRetry?: boolean;
  cleanupPhase?: { currentIndex: number; totalCount: number } | null;
  partSegments?: PartSegment[];
  /** Drawn over the progress rail (a quiz race's other players). */
  progressOverlay?: React.ReactNode;
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
  onProgressScrub,
  onProgressSeek,
  showPercentage = false,
  currentIndex, 
  totalCount, 
  isRetry = false,
  cleanupPhase = null,
  partSegments = [],
  progressOverlay,
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
  const progressRailRef = useRef<HTMLDivElement>(null);
  const [progressRailWidth, setProgressRailWidth] = useState(0);
  const reduceMotion = useReducedMotion();
  const hasAnimatedProgress = progress !== undefined && !usesStudyPartRail;
  useEffect(() => {
    const rail = progressRailRef.current;
    if (!hasAnimatedProgress || !rail) return;
    const measure = () => setProgressRailWidth(rail.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [hasAnimatedProgress]);
  const hasCenteredContent = progress === undefined && !eyebrow && (centerContent !== undefined || Boolean(title));
  const effectiveTotalCount = cleanupPhase ? cleanupPhase.totalCount : totalCount;
  const effectiveCurrentIndex = cleanupPhase ? cleanupPhase.currentIndex : currentIndex;
  const progressScale = visibleProgressScale(progress ?? 0, progressRailWidth);
  // Slide a full-size pill behind the track's mask: its round end never gets squashed.
  const progressLength = useSpring(progressScale * progressRailWidth, { stiffness: 280, damping: 32, mass: 0.7 });
  useEffect(() => {
    const length = progressScale * progressRailWidth;
    if (reduceMotion) progressLength.jump(length);
    else progressLength.set(length);
  }, [progressLength, progressScale, progressRailWidth, reduceMotion]);
  const progressOffset = useTransform(() => progressLength.get() - progressRailWidth);

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
            <div className={cn('relative w-full flex items-center justify-center gap-3', progressOverlay && 'min-h-16')}>
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
              ) : (
                <div
                  className={cn('relative w-full', onProgressSeek && 'cursor-pointer touch-none py-1.5')}
                  {...(onProgressSeek && {
                    role: 'slider',
                    tabIndex: 0,
                    'aria-label': 'Playback position',
                    'aria-valuemin': 0,
                    'aria-valuemax': 100,
                    'aria-valuenow': Math.round(Math.max(0, Math.min(100, progress))),
                    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      onProgressScrub?.(fractionFromPointer(e));
                    },
                    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
                      if (e.currentTarget.hasPointerCapture(e.pointerId)) onProgressScrub?.(fractionFromPointer(e));
                    },
                    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
                      if (e.currentTarget.hasPointerCapture(e.pointerId)) onProgressSeek(fractionFromPointer(e));
                    },
                    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
                      const step = e.key === 'ArrowRight' ? 0.05 : e.key === 'ArrowLeft' ? -0.05 : 0;
                      if (!step) return;
                      e.preventDefault();
                      e.stopPropagation();
                      onProgressSeek(Math.max(0, Math.min(1, progress / 100 + step)));
                    },
                  })}
                >
                <div ref={progressRailRef} role={onProgressSeek ? undefined : 'progressbar'} aria-label={onProgressSeek ? undefined : 'Study progress'} aria-valuemin={onProgressSeek ? undefined : 0} aria-valuemax={onProgressSeek ? undefined : 100} aria-valuenow={onProgressSeek ? undefined : Math.round(Math.max(0, Math.min(100, progress)))} className="relative h-5 w-full overflow-hidden rounded-full bg-brand-primary-track">
                  <motion.div
                    data-practice-progress-fill
                    className={`absolute inset-0 rounded-full ${accentBgClassName}`}
                    style={{ x: progressOffset }}
                  />
                  {/* A race hands the bar to RaceBar (own fill + shine); this one would run ahead of it. */}
                  {accentBgClassName !== 'bg-transparent' && (
                    <div aria-hidden className="absolute inset-x-2 top-1 h-1.5 overflow-hidden rounded-full">
                      <motion.div data-practice-progress-highlight className="absolute inset-0 rounded-full bg-white/30" style={{ x: progressOffset }} />
                    </div>
                  )}
                </div>
                </div>
              )}
              {showPercentage && (
                <span className="shrink-0 text-xs font-extrabold text-ui-muted tabular-nums sm:text-sm">
                  {Math.round(progress)}%
                </span>
              )}
              {progressOverlay}
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
          cleanupPhase ? (
            <span data-practice-counter className="text-base font-black tabular-nums tracking-wide text-brand-primary-deep">
              {cleanupPhase.currentIndex + 1} / {cleanupPhase.totalCount}
            </span>
          ) : isRetry ? (
            <span className="mt-0.5 text-xs font-extrabold tracking-wider text-feedback-warning-edge sm:text-sm sm:tracking-widest">
              Again
            </span>
          ) : (
            (currentIndex !== undefined && totalCount !== undefined && totalCount > 0) && (
              <span data-practice-counter className="text-base font-black tabular-nums tracking-wide text-ui-muted-strong">
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
          'flex w-full origin-top flex-col items-center justify-center border-b-2 border-ui-border pt-[env(safe-area-inset-top,0px)] ',
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
          "sticky top-0 z-30 flex w-full origin-top flex-col items-center pb-2 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] ",
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
