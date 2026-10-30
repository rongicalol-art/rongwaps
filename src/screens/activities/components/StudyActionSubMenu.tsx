import { AnimatePresence, motion } from 'motion/react';
import { ModeIcon } from '../../curriculum';
import type { StudyMaterialItem } from '../hooks/useStudyMaterials';

export interface StudyActionSubMenuProps {
  open: boolean;
  left: number | null;
  items: StudyMaterialItem[];
  onClose: () => void;
  side?: 'top' | 'left' | 'right';
}

export const STUDY_MENU_WIDTH = 200;

const rowClass = 'flex min-h-11 w-full items-center gap-3 rounded-compact px-3 py-2 text-left text-sm font-extrabold text-ui-ink-strong outline-none transition-colors hover:bg-ui-hover focus-ring sm:text-base';

/** The book button's menu: Grammar and Reading, each one combined run over the selected lessons. */
export function StudyActionSubMenu({
  open,
  left,
  items,
  onClose,
  side = 'top',
}: StudyActionSubMenuProps) {
  return (
    <AnimatePresence>
      {open && (
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
          style={{ width: STUDY_MENU_WIDTH, ...(side === 'top' ? { left: left ?? 0 } : {}) }}
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
  );
}
