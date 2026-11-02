import { useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useDismiss } from '../../hooks/useDismiss';
import { cn } from '../../utils/cn';
import { IconActionButton, type IconActionButtonProps } from './IconActionButton';

export interface SettingsPopoverProps extends Omit<IconActionButtonProps, 'onClick' | 'className' | 'aria-expanded' | 'aria-haspopup' | 'children'> {
  /** Trigger classes for the closed and open states. */
  triggerClassName?: (open: boolean) => string | undefined;
  /** Extra classes for the panel (e.g. its own spacing). */
  panelClassName?: string;
  /** Panel content; `close` hides the panel, e.g. before opening something else. */
  children: ReactNode | ((close: () => void) => ReactNode);
}

/** An icon button with a small settings panel under it; an outside click or Escape closes it. */
export function SettingsPopover({ triggerClassName, panelClassName, children, ...trigger }: SettingsPopoverProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  useDismiss({ ref: containerRef, onDismiss: close, isActive: open });

  return (
    <div ref={containerRef} className="relative">
      <IconActionButton
        {...trigger}
        onClick={() => setOpen((value) => !value)}
        className={triggerClassName?.(open)}
        aria-haspopup="dialog"
        aria-expanded={open}
      />
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
            className={cn('absolute right-0 top-full z-50 mt-2 w-64 popover-surface p-2.5 text-left sm:w-72', panelClassName)}
          >
            {typeof children === 'function' ? children(close) : children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
