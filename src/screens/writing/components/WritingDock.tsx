import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FloatingDock } from '../../../lib/widgets';
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
    <FloatingDock.Root>
      <FloatingDock.Pill maxWidth="md" className="p-0">
        <nav
          aria-label="Writing mode controls"
          className="flex w-full items-center justify-between gap-1 p-1.5 px-2.5"
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
                className="flex shrink-0 items-center justify-start overflow-hidden"
              >
                <div className="flex w-[48px] shrink-0 items-center justify-center pr-1.5">
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
      </FloatingDock.Pill>
    </FloatingDock.Root>
  );
}
