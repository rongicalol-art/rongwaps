import { useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ActionButton, KeyChip } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

interface TestDockProps {
  /** The primary action; Enter or Space presses it. */
  label: string;
  onPress: () => void;
  /** A quiet second action under (phone) or beside (desktop) the first. */
  secondary?: { label: string; onPress: () => void };
  /** Re-runs the rise when it changes (each new screen). */
  riseKey?: string;
  className?: string;
}

/** The test's bottom action: one big button on the canvas fade, like the practice docks. */
export function TestDock({ label, onPress, secondary, riseKey, className }: TestDockProps) {
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.key !== 'Enter' && event.key !== ' ') || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      // A focused button presses itself.
      if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLInputElement) return;
      event.preventDefault();
      onPress();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPress]);

  return (
    <div className={cn('pointer-events-none absolute inset-x-0 bottom-0 z-40 bg-gradient-to-t from-ui-practice-canvas from-70% to-transparent px-4 pb-sheet-safe pt-6', className)}>
      <motion.div
        key={riseKey}
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
        className={cn('pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-2 md:pb-6', secondary && 'md:max-w-2xl md:flex-row-reverse md:gap-4')}
      >
        <ActionButton size="lg" fullWidth onClick={onPress} className="text-base tracking-wider md:text-lg">
          <span className="relative">
            {label}
            <KeyChip className="border-brand-on-primary/40 text-brand-on-primary/80">Enter</KeyChip>
          </span>
        </ActionButton>
        {secondary && (
          <ActionButton
            variant="secondary"
            size="lg"
            fullWidth
            edgeColor="var(--color-ui-border)"
            onClick={secondary.onPress}
            className="text-base tracking-wider md:text-lg"
          >
            {secondary.label}
          </ActionButton>
        )}
      </motion.div>
    </div>
  );
}
