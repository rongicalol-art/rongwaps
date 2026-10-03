import { createContext, useRef, type ReactNode, type RefObject } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '../../utils/cn';
import { useDismiss } from '../../hooks/useDismiss';
import { useFloatingDockSleep } from '../../hooks/useFloatingDockSleep';

interface FloatingDockContextValue {
  visible: boolean;
}

const FloatingDockContext = createContext<FloatingDockContextValue | null>(null);

const PILL_MAX_WIDTHS = {
  sm: 'max-w-[280px]',
  md: 'max-w-[340px]',
  lg: 'max-w-[440px]',
  xl: 'max-w-[560px]',
  full: 'max-w-full',
};

export interface FloatingDockRootProps {
  visible?: boolean;
  position?: 'fixed' | 'absolute';
  zIndexClassName?: string;
  className?: string;
  children: ReactNode;
}

export function FloatingDockRoot({
  visible = true,
  position = 'absolute',
  zIndexClassName = 'z-dock',
  className,
  children,
}: FloatingDockRootProps) {
  const reduceMotion = useReducedMotion();

  return (
    <FloatingDockContext.Provider value={{ visible }}>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { y: 96 }}
            animate={reduceMotion ? { opacity: 1, y: 0 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: 96 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 380, damping: 34, mass: 0.8 }
            }
            className={cn(
              'pointer-events-none inset-x-0 bottom-dock-safe flex justify-center px-4',
              position === 'fixed' ? 'fixed' : 'absolute',
              zIndexClassName,
              className,
            )}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </FloatingDockContext.Provider>
  );
}

export interface FloatingDockPillProps {
  maxWidth?: keyof typeof PILL_MAX_WIDTHS;
  className?: string;
  sleepOnIdle?: boolean;
  isLockedAwake?: boolean;
  children: ReactNode;
}

export function FloatingDockPill({
  maxWidth = 'md',
  className,
  sleepOnIdle = true,
  isLockedAwake = false,
  children,
}: FloatingDockPillProps) {
  const { dockRef, isAsleep, dockProps } = useFloatingDockSleep({
    enabled: sleepOnIdle,
    isLockedAwake,
  });

  return (
    <div
      ref={dockRef}
      {...dockProps}
      className={cn(
        'pointer-events-auto relative flex w-full items-center justify-center rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-1.5 px-2.5 shadow-ambient-sm',
        'transition-[opacity,box-shadow]',
        isAsleep
          ? 'opacity-20 shadow-none duration-300 ease-in-out'
          : 'opacity-100 duration-200 ease-out',
        PILL_MAX_WIDTHS[maxWidth],
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface FloatingDockPopoverProps {
  open: boolean;
  onClose: () => void;
  align?: 'left' | 'center' | 'right';
  className?: string;
  containerRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}

export function FloatingDockPopover({
  open,
  onClose,
  align = 'right',
  className,
  containerRef: externalRef,
  children,
}: FloatingDockPopoverProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const popoverRef = externalRef ?? internalRef;
  const reduceMotion = useReducedMotion();

  useDismiss({
    ref: popoverRef,
    onDismiss: onClose,
    isActive: open,
  });

  const alignClass = {
    left: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    right: 'right-0',
  }[align];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={popoverRef as RefObject<HTMLDivElement>}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
          className={cn('absolute bottom-full mb-2 z-50 pointer-events-auto', alignClass, className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const FloatingDock = {
  Root: FloatingDockRoot,
  Pill: FloatingDockPill,
  Popover: FloatingDockPopover,
};
