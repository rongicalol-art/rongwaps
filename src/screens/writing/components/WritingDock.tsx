import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '../../../utils/cn';
import { WritingDockButton } from './WritingDockButton';

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
                  <WritingDockButton
                    icon="back"
                    label="Previous character"
                    ariaLabel="Go to previous character"
                    onClick={onPrevChar}
                    disabled={!canGoPrevChar}
                    layout="fixed"
                    className={cn(!canGoPrevChar && 'pointer-events-none opacity-30')}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Restart current character */}
          <WritingDockButton
            icon="restart"
            label="Restart character"
            ariaLabel="Restart current character"
            onClick={onRestartChar}
          />

          {/* Show stroke order */}
          <WritingDockButton
            icon="play"
            label="Show stroke order"
            ariaLabel="Show stroke order animation"
            onClick={onAnimateStrokes}
            disabled={isAnimatingStrokes}
            className={cn(isAnimatingStrokes && 'opacity-60')}
            iconClassName={cn(isAnimatingStrokes && 'text-brand-primary animate-pulse')}
          />

          {/* Outline toggle */}
          <WritingDockButton
            icon="eye"
            label="Toggle outline"
            ariaLabel="Toggle character outline"
            title={showOutline ? 'Hide outline' : 'Show outline'}
            role="switch"
            aria-checked={showOutline}
            onClick={onToggleOutline}
            tone={showOutline ? 'selected' : 'default'}
            activePillLayoutId={showOutline ? 'writing-outline-active-pill' : undefined}
          />

          {/* Exit */}
          <WritingDockButton
            icon="close"
            label="Exit writing mode"
            tone="danger"
            onClick={onExit}
          />
        </nav>
      </div>
    </motion.div>
  );
}
