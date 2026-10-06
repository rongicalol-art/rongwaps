import { AnimatePresence, motion } from 'motion/react';
import { ActionButton, PlayfulNavIcon } from '../../../lib/widgets';

export interface StudyActionSubMenuProps {
  open: boolean;
  left: number | null;
  onOpenGrammar?: () => void;
  onOpenReading?: () => void;
  onClose: () => void;
  side?: 'top' | 'left' | 'right';
}

export function StudyActionSubMenu({
  open,
  left,
  onOpenGrammar,
  onOpenReading,
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
              left: 'absolute right-full top-1/2 -translate-y-1/2 pr-3 w-60 sm:w-64 z-50 pointer-events-auto',
              right: 'absolute left-full top-1/2 -translate-y-1/2 pl-3 w-60 sm:w-64 z-50 pointer-events-auto',
              top: 'absolute bottom-full pb-3 w-60 sm:w-64 z-50 pointer-events-auto',
            }[side]
          }
          style={
            side === 'top'
              ? { left: left !== null ? `${left}px` : 'calc(50% - 120px)' }
              : undefined
          }
        >
          <div
            role="menu"
            aria-label="Choose Grammar or Reading"
            className="popover-surface p-2 flex flex-col gap-1.5"
          >
            {onOpenGrammar && (
              <ActionButton
                role="menuitem"
                variant="quiet"
                size="md"
                fullWidth
                className="justify-start gap-3 px-4 py-2.5 text-left text-sm sm:text-base font-extrabold text-ui-ink-strong hover:text-feedback-warning-edge"
                onClick={() => {
                  onClose();
                  onOpenGrammar();
                }}
              >
                <PlayfulNavIcon name="grammar" className="h-6 w-6" />
                <span>Grammar</span>
              </ActionButton>
            )}
            {onOpenReading && (
              <ActionButton
                role="menuitem"
                variant="quiet"
                size="md"
                fullWidth
                className="justify-start gap-3 px-4 py-2.5 text-left text-sm sm:text-base font-extrabold text-ui-ink-strong hover:text-brand-primary"
                onClick={() => {
                  onClose();
                  onOpenReading();
                }}
              >
                <PlayfulNavIcon name="reading" className="h-6 w-6" />
                <span>Reading</span>
              </ActionButton>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
