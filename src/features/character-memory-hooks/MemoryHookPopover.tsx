import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion, type MotionValue } from 'motion/react';
import { AppIcon } from '../../lib/widgets';
import { cn } from '../../utils/cn';
import { renderHookText } from './hookText';

export interface MemoryHookPopoverProps {
  open: boolean;
  /** Anchor rectangle (character center or chip corner) in viewport coordinates. */
  anchor: { x: number; top: number; bottom: number } | null;
  above: boolean;
  /** undefined while loading, null when no hook exists. */
  hook: string | null | undefined;
  loaded: boolean;
  emptyText: ReactNode;
  /** Optional cursor spring so the popover pulls with its trigger (characters). */
  magneticX?: MotionValue<number>;
  magneticY?: MotionValue<number>;
}

/**
 * Shared memory-hook popover shell: portal (never clipped), fixed width with a
 * two-line reserved body (loading never resizes it), one quiet fade/rise, and
 * an optional magnetic follow. Used by character hover and the word-hook chip.
 */
export function MemoryHookPopover({
  open,
  anchor,
  above,
  hook,
  loaded,
  emptyText,
  magneticX,
  magneticY,
}: MemoryHookPopoverProps) {
  const reduceMotion = useReducedMotion();
  if (!open || !anchor) return null;

  const openTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.18, ease: 'easeOut' as const };

  const card = (
    <motion.span
      key="memory-hook-tooltip"
      initial={{ opacity: 0, scale: 0.97, y: above ? 6 : -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={openTransition}
      style={{ transformOrigin: above ? '50% 100%' : '50% 0%' }}
      className="relative block w-[min(236px,72vw)]"
    >
      <span className="block rounded-compact border-2 border-feedback-warning-edge border-b-[length:var(--depth-sm)] bg-feedback-warning-surface px-3 py-2 text-left shadow-ambient-sm">
        <span className="flex items-center gap-1.5 mb-1">
          <AppIcon name="sparkles" size={11} className="text-feedback-warning-edge" />
          <span className="text-[10px] font-black uppercase tracking-wider text-feedback-warning-edge">
            Memory hook
          </span>
        </span>
        {/* Fixed width + two reserved lines keep the popover from resizing
            while the hook text loads. */}
        <span className="block min-h-[40px] text-[12px] font-bold leading-relaxed text-ui-ink">
          {loaded ? (
            hook ? (
              renderHookText(hook)
            ) : (
              <span className="flex items-center gap-1 text-ui-muted">
                {emptyText}
              </span>
            )
          ) : (
            <span className="flex flex-col justify-start gap-1.5 pt-0.5">
              <span className="block h-[13px] w-full animate-pulse rounded-full bg-feedback-warning-edge/15" />
              <span className="block h-[13px] w-3/4 animate-pulse rounded-full bg-feedback-warning-edge/15" />
            </span>
          )}
        </span>
      </span>
      <span
        className={cn(
          'absolute left-1/2 -translate-x-1/2 border-x-[7px] border-x-transparent border-t-[7px] border-t-feedback-warning-edge',
          above ? 'top-full' : 'bottom-full rotate-180',
        )}
      />
    </motion.span>
  );

  return createPortal(
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-[800]"
      style={{
        left: anchor.x,
        top: above ? anchor.top : anchor.bottom,
        transform: `translate(-50%, ${above ? 'calc(-100% - 10px)' : '10px'})`,
      }}
    >
      {magneticX && magneticY
        ? <motion.div style={{ x: magneticX, y: magneticY }}>{card}</motion.div>
        : card}
    </div>,
    document.body,
  );
}
