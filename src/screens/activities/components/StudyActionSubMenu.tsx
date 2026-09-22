import { AnimatePresence, motion } from 'motion/react';
import { ActionButton, AppIcon } from '../../../lib/widgets';

export interface StudyActionSubMenuProps {
  open: boolean;
  left: number | null;
  onOpenGrammar?: () => void;
  onOpenReading?: () => void;
  onClose: () => void;
}

export function StudyActionSubMenu({
  open,
  left,
  onOpenGrammar,
  onOpenReading,
  onClose,
}: StudyActionSubMenuProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
          className="absolute bottom-full pb-3 w-60 sm:w-64 z-50 pointer-events-auto"
          style={{
            left: left !== null ? `${left}px` : 'calc(50% - 120px)',
          }}
        >
          <div
            role="menu"
            aria-label="Choose Grammar or Reading"
            className="rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-2 shadow-ambient-lg flex flex-col gap-1.5"
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
                <AppIcon name="grammar" size={22} className="text-feedback-warning-edge shrink-0" />
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
                <AppIcon name="book" size={22} className="text-brand-primary shrink-0" />
                <span>Reading</span>
              </ActionButton>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
