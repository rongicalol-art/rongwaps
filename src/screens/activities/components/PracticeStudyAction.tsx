import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PlayfulNavIcon } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';
import { ModeIcon } from '../../curriculum';
import type { StudyMaterialItem } from '../hooks/useStudyMaterials';

const STUDY_MENU_WIDTH = 200;
const rowClass = 'flex min-h-11 w-full items-center gap-3 rounded-compact px-3 py-2 text-left text-sm font-extrabold text-ui-ink-strong outline-none transition-colors hover:bg-ui-hover focus-ring sm:text-base';

interface PracticeStudyActionProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  items: StudyMaterialItem[];
  hasFeedback?: boolean;
  side?: 'top' | 'left' | 'right';
  className?: string;
}

export function PracticeStudyAction({
  isOpen,
  onToggle,
  onClose,
  items,
  hasFeedback,
  side = 'top',
  className,
}: PracticeStudyActionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [menuLeft, setMenuLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (!containerRef.current) return;
      const buttonRect = containerRef.current.getBoundingClientRect();
      const menuWidth = STUDY_MENU_WIDTH;
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
      className={cn('relative shrink-0', className)}
    >
      <AnimatePresence>
        {isOpen && !hasFeedback && items.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className={
              {
                left: 'absolute right-full top-1/2 -translate-y-1/2 pr-3 z-50 pointer-events-auto',
                right: 'absolute left-full top-1/2 -translate-y-1/2 pl-3 z-50 pointer-events-auto',
                top: 'absolute bottom-full pb-3 z-50 pointer-events-auto',
              }[side]
            }
            style={{ width: STUDY_MENU_WIDTH, ...(side === 'top' ? { left: menuLeft ?? 0 } : {}) }}
          >
            <div role="menu" aria-label="Grammar and reading" className="popover-surface flex flex-col p-2">
              {items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  className={rowClass}
                  onClick={() => {
                    onClose();
                    item.open();
                  }}
                >
                  <ModeIcon mode={item.key} playKey={0} motion="none" className="h-7 w-7" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={items.length === 1 ? items[0].open : onToggle}
        aria-label={items.length === 1 ? items[0].label : "Grammar and reading"}
        aria-expanded={items.length > 1 ? isOpen : undefined}
        aria-haspopup={items.length > 1 ? 'menu' : undefined}
        className={cn(
          'group relative inline-flex shrink-0 items-center justify-center outline-none select-none focus-ring',
          'dock-pill aspect-square rounded-feature bg-ui-surface',
          // Same surface as the mode pill beside it: no outline, just the deeper bottom edge.
          'border-b-[length:var(--depth-md)] border-ui-border shadow-ambient-sm',
          'transition-[background-color,box-shadow] duration-150 ease-out',
          isOpen
            ? 'bg-ui-hover'
            : 'hover:bg-ui-hover',
        )}
      >
        <PlayfulNavIcon
          name="studyBook"
          className={cn(
            'h-7 w-7 transition-transform duration-200',
            isOpen ? 'scale-95' : 'group-hover:scale-110 group-active:scale-95',
          )}
        />
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-50 hidden items-center',
            {
              left: 'right-full top-1/2 mr-3 -translate-y-1/2',
              right: 'left-full top-1/2 ml-3 -translate-y-1/2',
              top: 'bottom-full left-0 mb-3',
            }[side],
            'whitespace-nowrap rounded-control border-b-2 border-ui-border bg-ui-surface px-3 py-1.5 text-xs font-black uppercase tracking-wider text-ui-ink-strong shadow-md group-aria-expanded:!hidden [@media(hover:hover)]:group-hover:flex',
          )}
        >
          {items.map((item) => item.label).join(' & ')}
        </span>
      </button>
    </motion.div>
  );
}
