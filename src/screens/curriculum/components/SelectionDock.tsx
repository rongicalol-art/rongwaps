import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ActionButton, AppIcon } from '../../../lib/widgets';

interface SelectionDockProps {
  count: number;
  accentBgClassName: string;
  edgeHex: string;
  disabled?: boolean;
  onStart: () => void;
  onCancel: () => void;
}

/** Bottom bar while lessons are being picked. One lesson: just Start (tap it again to drop it). Several: Cancel and Start with the count. */
export function SelectionDock({ count, accentBgClassName, edgeHex, disabled, onStart, onCancel }: SelectionDockProps) {
  const reduceMotion = useReducedMotion();
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          transition={reduceMotion ? { duration: 0.1 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="workspace-window pointer-events-none fixed bottom-0 right-0 z-50 bg-gradient-to-t from-ui-canvas via-ui-canvas/95 to-transparent pb-sheet-safe pt-16"
        >
          <div className="mx-auto flex w-full max-w-md items-center gap-3 px-4 md:px-6">
            {count > 1 && (
            <ActionButton
              variant="secondary"
              size="lg"
              edgeColor="var(--color-ui-divider)"
              onClick={onCancel}
              className="pointer-events-auto min-h-14 !border-ui-divider px-5"
            >
              Cancel
            </ActionButton>
            )}
            <ActionButton
              size="lg"
              fullWidth
              disabled={disabled}
              onClick={onStart}
              edgeColor={edgeHex}
              aria-label={`Start with ${count} selected ${count === 1 ? 'lesson' : 'lessons'}`}
              className={`pointer-events-auto min-h-14 btn-touch-primary ${accentBgClassName}`}
            >
              <AppIcon name="play" size={20} />
              <span className="whitespace-nowrap">Start{count > 1 && <span className="opacity-80"> · {count}</span>}</span>
            </ActionButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
