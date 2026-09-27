import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppIcon, IconActionButton, ToggleSwitch } from '../../../lib/widgets';
import { useDismiss } from '../../../hooks/useDismiss';
import { usePracticePreferencesStore } from '../../../store/usePracticePreferencesStore';

/**
 * Contextual display settings for the character-breakdown window. For now it
 * surfaces the study preference that governs example-sentence pinyin; future
 * breakdown display toggles slot into the same switch list.
 */
export function BreakdownSettingsPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideExamplePinyin = usePracticePreferencesStore((state) => state.hideExamplePinyin);
  const updatePreferences = usePracticePreferencesStore((state) => state.updatePreferences);

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
        icon={<AppIcon name="settings" size={25} />}
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
            className="absolute right-0 top-full z-50 mt-2 w-64 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-2.5 text-left shadow-ambient-lg sm:w-72"
          >
            <div role="menu" aria-label="Breakdown display" className="flex flex-col gap-1.5">
              <button
                type="button"
                role="switch"
                aria-checked={hideExamplePinyin}
                onClick={() => updatePreferences({ hideExamplePinyin: !hideExamplePinyin })}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-compact px-3 py-2 text-sm font-extrabold text-ui-ink-strong transition-colors outline-none hover:bg-ui-hover focus-ring"
              >
                <span>Hide pinyin on example sentences</span>
                <ToggleSwitch checked={hideExamplePinyin} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
