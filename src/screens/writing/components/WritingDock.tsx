import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AppIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

export interface WritingDockProps {
  onRestartChar: () => void;
  onPrevChar?: () => void;
  canGoPrevChar?: boolean;
  hasMultipleChars?: boolean;
  onAnimateStrokes: () => void;
  showOutline: boolean;
  onToggleOutline: () => void;
  onExit: () => void;
  isAnimatingStrokes?: boolean;
}

export function WritingDock({
  onRestartChar,
  onPrevChar,
  canGoPrevChar = false,
  hasMultipleChars = false,
  onAnimateStrokes,
  showOutline,
  onToggleOutline,
  onExit,
  isAnimatingStrokes = false,
}: WritingDockProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 26, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.985 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 360, damping: 32, mass: 0.72 }
      }
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[250] mb-4 flex justify-center px-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] pt-3 md:mb-6"
    >
      <div className="pointer-events-auto relative flex w-full max-w-[320px] items-center justify-center">
        <nav
          aria-label="Writing mode controls"
          className="flex h-14 w-full items-center justify-between gap-1 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-1 px-2.5 shadow-ambient-sm"
        >
          {/* Previous character (for multi-character words) */}
          <AnimatePresence initial={false}>
            {hasMultipleChars && (
              <motion.div
                key="prev-char-container"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 52 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, width: 0 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }
                }
                className="flex items-center justify-start overflow-hidden shrink-0"
              >
                <div className="w-[48px] shrink-0 pr-1.5 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={onPrevChar}
                    disabled={!canGoPrevChar}
                    title="Previous character"
                    aria-label="Go to previous character"
                    className={cn(
                      'group relative inline-flex h-10 w-10 items-center justify-center rounded-control outline-none select-none text-ui-muted-strong hover:bg-ui-hover hover:text-ui-ink-strong transition-colors duration-150 focus-ring',
                      !canGoPrevChar && 'cursor-not-allowed opacity-30 pointer-events-none'
                    )}
                  >
                    <span className="relative z-10 flex items-center justify-center transition-transform duration-100 group-active:scale-95">
                      <AppIcon
                        name="back"
                        size={24}
                        className="h-6 w-6 transition-transform group-hover:scale-105"
                      />
                      <span className="sr-only">Previous character</span>
                    </span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Restart current character */}
          <button
            type="button"
            onClick={onRestartChar}
            title="Restart character"
            aria-label="Restart current character"
            className="group relative inline-flex h-10 min-w-0 flex-1 items-center justify-center rounded-control px-2 outline-none select-none text-ui-muted-strong hover:bg-ui-hover hover:text-ui-ink-strong transition-colors duration-150 focus-ring"
          >
            <span className="relative z-10 flex items-center justify-center transition-transform duration-100 group-active:scale-95">
              <AppIcon
                name="restart"
                size={24}
                className="h-6 w-6 transition-transform group-hover:scale-105 md:h-[24px] md:w-[24px]"
              />
              <span className="sr-only">Restart character</span>
            </span>
          </button>

          {/* Show stroke order */}
          <button
            type="button"
            onClick={onAnimateStrokes}
            disabled={isAnimatingStrokes}
            title="Show stroke order"
            aria-label="Show stroke order animation"
            className={cn(
              'group relative inline-flex h-10 min-w-0 flex-1 items-center justify-center rounded-control px-2 outline-none select-none text-ui-muted-strong hover:bg-ui-hover hover:text-ui-ink-strong transition-colors duration-150 focus-ring',
              isAnimatingStrokes && 'cursor-not-allowed opacity-60'
            )}
          >
            <span className="relative z-10 flex items-center justify-center transition-transform duration-100 group-active:scale-95">
              <AppIcon
                name="play"
                size={24}
                className={cn(
                  'h-6 w-6 transition-transform group-hover:scale-105 md:h-[24px] md:w-[24px]',
                  isAnimatingStrokes && 'text-brand-primary animate-pulse'
                )}
              />
              <span className="sr-only">Show stroke order</span>
            </span>
          </button>

          {/* Outline toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={showOutline}
            onClick={onToggleOutline}
            title={showOutline ? 'Hide outline' : 'Show outline'}
            aria-label="Toggle character outline"
            className={cn(
              'group relative inline-flex h-10 min-w-0 flex-1 items-center justify-center rounded-control px-2 outline-none select-none transition-colors duration-150 focus-ring',
              showOutline
                ? 'text-white'
                : 'text-ui-muted-strong hover:bg-ui-hover hover:text-ui-ink-strong'
            )}
          >
            {showOutline && (
              <motion.div
                layoutId="writing-outline-active-pill"
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : {
                        type: 'spring',
                        stiffness: 450,
                        damping: 34,
                        mass: 0.8,
                      }
                }
                className="absolute inset-0 rounded-control border-b-[length:var(--depth-sm)] border-brand-primary-edge bg-brand-primary shadow-ambient-sm"
              />
            )}
            <span className="relative z-10 flex items-center justify-center transition-transform duration-100 group-active:scale-95">
              <AppIcon
                name="eye"
                size={24}
                className="h-6 w-6 transition-transform group-hover:scale-105 md:h-[24px] md:w-[24px]"
              />
              <span className="sr-only">Toggle outline</span>
            </span>
          </button>

          {/* Exit */}
          <button
            type="button"
            onClick={onExit}
            title="Exit writing mode"
            aria-label="Exit writing mode"
            className="group relative inline-flex h-10 min-w-0 flex-1 items-center justify-center rounded-control px-2 outline-none select-none text-ui-muted-strong hover:bg-feedback-danger/10 hover:text-feedback-danger transition-colors duration-150 focus-ring"
          >
            <span className="relative z-10 flex items-center justify-center transition-transform duration-100 group-active:scale-95">
              <AppIcon
                name="close"
                size={24}
                className="h-6 w-6 transition-transform group-hover:scale-105 md:h-[24px] md:w-[24px]"
              />
              <span className="sr-only">Exit writing mode</span>
            </span>
          </button>
        </nav>
      </div>
    </motion.div>
  );
}
