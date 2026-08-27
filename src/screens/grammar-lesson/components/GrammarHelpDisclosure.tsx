import { useId, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AppIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

interface GrammarHelpDisclosureProps {
  title: string;
  children: ReactNode;
  className?: string;
}

/**
 * Controlled quiet disclosure. Lab content is only mounted while open, so
 * collapsed state never exposes focusable or announced controls.
 */
export function GrammarHelpDisclosure({ title, children, className }: GrammarHelpDisclosureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const contentId = useId();
  const reduceMotion = useReducedMotion();

  const toggle = () => {
    if (isOpen) {
      setIsOpen(false);
      buttonRef.current?.focus();
    } else {
      setIsOpen(true);
    }
  };

  return (
    <div className={cn('border-b border-ui-divider', className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={toggle}
        className="flex min-h-12 w-full cursor-pointer items-center justify-end gap-2 py-3 text-right outline-none transition-colors hover:text-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
      >
        <span className="text-sm font-black text-ui-ink-strong">{title}</span>
        <span
          aria-hidden="true"
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ui-hover text-ui-muted-strong transition-transform',
            isOpen && 'rotate-180',
          )}
        >
          <AppIcon name="expand" size={17} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={contentId}
            initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
