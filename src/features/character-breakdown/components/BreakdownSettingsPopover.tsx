import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppIcon, IconActionButton, SwitchRow } from '../../../lib/widgets';
import { useDismiss } from '../../../hooks/useDismiss';
import { useAppStore } from '../../../store/useAppStore';
import { SAMPLE_BOOKS } from '../../../data/books';

/**
 * Contextual display settings for the character-breakdown window. For now it
 * surfaces the study preference that governs example-sentence pinyin; future
 * breakdown display toggles slot into the same switch list.
 */
export function BreakdownSettingsPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideExamplePinyin = useAppStore((state) => state.hideExamplePinyin);
  const updatePreferences = useAppStore((state) => state.updatePreferences);
  const activeBookId = useAppStore((state) => state.activeBookId);
  const activeBook = SAMPLE_BOOKS.find((b) => b.id === activeBookId) || SAMPLE_BOOKS[0];

  useDismiss({
    ref: containerRef,
    onDismiss: () => setIsOpen(false),
    isActive: isOpen,
  });

  return (
    <div ref={containerRef} className="relative">
      <IconActionButton
        size="lg"
        onClick={() => setIsOpen((open) => !open)}
        className={isOpen ? 'bg-ui-hover' : undefined}
        icon={(
          <AppIcon
            name="menu"
            size={24}
            color={activeBook.accentHex}
            className={activeBook.accent}
          />
        )}
        label="Breakdown settings"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
            className="absolute right-0 top-full z-50 mt-2 w-64 popover-surface p-2.5 text-left sm:w-72"
          >
            <div role="menu" aria-label="Breakdown display" className="flex flex-col gap-1.5">
              <SwitchRow label="Hide pinyin on example sentences" checked={hideExamplePinyin} onToggle={() => updatePreferences({ hideExamplePinyin: !hideExamplePinyin })} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
