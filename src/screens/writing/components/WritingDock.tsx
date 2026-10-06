import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { DOCK_SWAP, usePracticeDockSlot } from '../../../features/practice';
import { cn } from '../../../utils/cn';
import { WritingDockButton } from './WritingDockButton';

export interface WritingDockProps {
  /** Controls are shown while the card is being written; they leave when it finishes. */
  visible: boolean;
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

/**
 * Writing controls. They render inside the shared practice dock (via its slot)
 * rather than as a second dock, so they follow the dock's style, position and
 * auto-hide.
 */
export function WritingDock({
  visible,
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
  const dockSlot = usePracticeDockSlot();
  const setExclusive = dockSlot?.setExclusive;

  // While writing, these controls stand in for the dock's mode switcher.
  useEffect(() => {
    if (!setExclusive || !visible) return;
    setExclusive(true);
    return () => setExclusive(false);
  }, [setExclusive, visible]);

  if (!dockSlot?.slot) return null;
  const isVertical = dockSlot.isVertical;

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          key="writing-controls"
          initial={{ opacity: 0, y: reduceMotion ? 0 : DOCK_SWAP.distance }}
          animate={{
            opacity: 1,
            y: 0,
            // Wait for the mode switcher to slide away before rising in.
            transition: { duration: DOCK_SWAP.enterSeconds, ease: DOCK_SWAP.ease, delay: DOCK_SWAP.exitSeconds },
          }}
          exit={{
            opacity: 0,
            y: reduceMotion ? 0 : DOCK_SWAP.distance,
            transition: { duration: DOCK_SWAP.exitSeconds, ease: DOCK_SWAP.ease },
          }}
        >
        <nav
          aria-label="Writing mode controls"
          className={cn(
            'flex w-full items-center justify-between gap-1 rounded-feature border-2 border-ui-border border-b-[length:var(--depth-md)] bg-ui-surface p-1.5 shadow-ambient-sm',
            isVertical && 'flex-col',
          )}
        >
          {/* Previous character (for multi-character words) */}
          <AnimatePresence initial={false}>
            {hasMultipleChars && (
              <motion.div
                key="prev-char-container"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, ...(isVertical ? { height: 0 } : { width: 0 }) }}
                animate={isVertical ? { opacity: 1, height: 48 } : { opacity: 1, width: 52 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, ...(isVertical ? { height: 0 } : { width: 0 }) }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }
                }
                className="flex shrink-0 items-center justify-start overflow-hidden"
              >
                <div className={cn('flex shrink-0 items-center justify-center', isVertical ? 'h-12 w-full pb-1.5' : 'w-12 pr-1.5')}>
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
        </motion.div>
      )}
    </AnimatePresence>,
    dockSlot.slot,
  );
}
