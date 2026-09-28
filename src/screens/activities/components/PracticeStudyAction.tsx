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
          'group relative inline-flex shrink-0 items-center justify-center outline-none select-none focus-ring',
          'dock-pill w-[60px] rounded-feature bg-ui-surface',
          // Universal tactile 3D bottom: gold border with a deeper bottom
          // block, matching the dock pill and the segmented control beside it.
          'border-2 border-feedback-warning-edge border-b-[length:var(--depth-md)] shadow-ambient-sm',
          'transition-[background-color,box-shadow] duration-150 ease-out',
          isOpen
            ? 'bg-ui-hover ring-2 ring-feedback-warning-edge/40'
            : 'hover:bg-ui-hover',
        )}
      >
        <AppIcon
          name="grammar"
          size={28}
          className={cn(
            'h-7 w-7 text-feedback-warning-edge transition-transform duration-200',
            isOpen ? 'scale-95' : 'group-hover:scale-110 group-active:scale-95',
          )}
        />
      </button>
    </motion.div>
  );
}
