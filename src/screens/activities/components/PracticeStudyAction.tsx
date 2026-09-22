import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { AppIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import { StudyActionSubMenu } from './StudyActionSubMenu';

interface PracticeStudyActionProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onOpenGrammar?: () => void;
  onOpenReading?: () => void;
  hasFeedback?: boolean;
}

export function PracticeStudyAction({
  isOpen,
  onToggle,
  onClose,
  onOpenGrammar,
  onOpenReading,
  hasFeedback,
}: PracticeStudyActionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [menuLeft, setMenuLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (!containerRef.current) return;
      const buttonRect = containerRef.current.getBoundingClientRect();
      const menuWidth = 240;
      const halfWidth = menuWidth / 2;
      const idealLeft = buttonRect.width / 2 - halfWidth;

      const minScreenX = 16;
      const maxScreenX = window.innerWidth - 16;
      const minLeft = minScreenX - buttonRect.left;
      const maxLeft = maxScreenX - menuWidth - buttonRect.left;

      setMenuLeft(Math.max(minLeft, Math.min(idealLeft, maxLeft)));
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [isOpen]);

  return (
    <motion.div
      ref={containerRef}
      key="grammar-entry"
      initial={{ opacity: 0, scale: 0.92, x: 8 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.92, x: 8 }}
      transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
      className="relative shrink-0"
    >
      <StudyActionSubMenu
        open={isOpen && !hasFeedback}
        left={menuLeft}
        onOpenGrammar={onOpenGrammar}
        onOpenReading={onOpenReading}
        onClose={onClose}
      />

      <button
        type="button"
        onClick={onToggle}
        aria-label="Study materials (grammar and reading)"
        title="Study materials (grammar and reading)"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={cn(
          'group relative inline-flex shrink-0 items-stretch justify-center p-0 border-none bg-transparent outline-none select-none focus-ring',
          'dock-pill w-[60px] rounded-feature',
        )}
      >
        {/* Stationary 3D Edge / Base (Aligned with the dock pill's 4px bottom border) */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 top-[length:var(--depth-md)] rounded-[inherit] bg-ui-border"
        />

        {/* Moving Front Surface (4px tactile travel on active; depressed when sub-menu is open) */}
        <span
          className={cn(
            'relative flex w-full h-full items-center justify-center rounded-[inherit] mb-[length:var(--depth-md)]',
            'border-2 border-ui-border bg-ui-surface shadow-ambient-sm',
            'transition-[transform,background-color,border-color,color] duration-150 ease-out',
            isOpen
              ? 'translate-y-[length:var(--depth-md)] border-feedback-warning-edge bg-ui-hover ring-2 ring-brand-primary/40'
              : 'group-active:translate-y-[length:var(--depth-md)] hover:bg-ui-hover hover:border-feedback-warning-edge/60',
          )}
        >
          <AppIcon
            name="grammar"
            size={28}
            className={cn(
              'h-7 w-7 text-feedback-warning-edge transition-transform duration-200',
              isOpen ? 'scale-95 text-feedback-warning-edge' : 'group-hover:scale-110',
            )}
          />
        </span>
      </button>
    </motion.div>
  );
}
