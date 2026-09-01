import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { PracticePreferences } from '../../../store/usePracticePreferencesStore';
import { cn } from '../../../utils/cn';
import { ActionButton, AppIcon, IconActionButton, type AppIconName } from '../../../lib/widgets';
import { QuizModeSettingsTab } from '../settings/QuizModeSettingsTab';
import { FlowModeSettingsTab } from '../settings/FlowModeSettingsTab';
import { GeneralSettingsTab } from '../settings/GeneralSettingsTab';
import { useModalFocus } from '../../../hooks/useModalFocus';

type SettingsTab = 'quiz' | 'flow' | 'general';

const TABS: Array<{ id: SettingsTab; label: string; icon: AppIconName }> = [
  { id: 'general', label: 'General', icon: 'settings' },
  { id: 'quiz', label: 'Quiz mode', icon: 'exam' },
  { id: 'flow', label: 'Flow mode', icon: 'flow' },
];

export interface PracticeSettingsScreenProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
  preferences: PracticePreferences;
  onPreferencesChange: (preferences: Partial<PracticePreferences>) => void;
  characterPreference: 'traditional' | 'simplified';
  onCharacterPreferenceChange: (preference: 'traditional' | 'simplified') => void;
}

export function PracticeSettingsScreen({
  isOpen,
  onClose,
  preferences,
  onPreferencesChange,
  characterPreference,
  onCharacterPreferenceChange,
  className,
  ...props
}: PracticeSettingsScreenProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const modalFocusProps = useModalFocus({
    containerRef: dialogRef,
    isActive: isOpen,
    onEscape: onClose,
  });

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('general');
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  const tabProps = {
    preferences,
    onChange: onPreferencesChange,
    characterPreference,
    onCharacterPreferenceChange,
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[700]">
          {/* Dimmed theme-aware backdrop — covers the full viewport, nav included */}
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.16 }}
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-ui-ink-strong/40 backdrop-blur-sm"
          />

          {/* Centering wrapper */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 sm:p-6">
            {/* Centered fixed-size modal card */}
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="practice-settings-title"
              tabIndex={-1}
              onKeyDown={modalFocusProps.onKeyDown}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
              className="pointer-events-auto relative flex h-[540px] w-[600px] max-h-full max-w-full flex-col overflow-hidden rounded-[24px] border-b-4 border-ui-border bg-ui-canvas shadow-xl outline-none"
            >
            <h2 id="practice-settings-title" className="sr-only">Practice settings</h2>

            <header className="z-30 flex shrink-0 items-center gap-2 border-b border-ui-divider bg-ui-canvas/95 px-3 pb-2 pt-2 backdrop-blur sm:px-4">
              <IconActionButton
                onClick={onClose}
                label="Close practice settings"
                size="lg"
                icon={<AppIcon name="close" size={22} />}
              />
              <nav aria-label="Practice settings sections" className="min-w-0 flex-1 rounded-[17px] bg-ui-hover p-1" role="tablist">
                <div className="grid grid-cols-3 gap-1">
                  {TABS.map((tab) => <SettingsTabButton key={tab.id} tab={tab} selected={activeTab === tab.id} onSelect={setActiveTab} />)}
                </div>
              </nav>
            </header>

            <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
              <div className="mx-auto w-full" {...props}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={activeTab}
                    id={`practice-settings-panel-${activeTab}`}
                    role="tabpanel"
                    aria-labelledby={`practice-settings-tab-${activeTab}`}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                    transition={{ duration: reduceMotion ? 0 : 0.14, ease: 'easeOut' }}
                    className={cn('outline-none', className)}
                  >
                    {activeTab === 'quiz' && <QuizModeSettingsTab {...tabProps} />}
                    {activeTab === 'flow' && <FlowModeSettingsTab {...tabProps} />}
                    {activeTab === 'general' && <GeneralSettingsTab {...tabProps} />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </main>

            <footer className="shrink-0 border-t border-ui-divider bg-ui-canvas px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3 sm:px-6">
              <ActionButton
                variant="primary"
                size="lg"
                fullWidth
                onClick={onClose}
                className="mx-auto max-w-2xl uppercase tracking-widest"
              >
                Done
              </ActionButton>
            </footer>
          </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function SettingsTabButton({ tab, selected, onSelect }: { tab: (typeof TABS)[number]; selected: boolean; onSelect: (tab: SettingsTab) => void }) {
  const shortLabel = tab.label.replace(' mode', '');
  return (
    <button
      id={`practice-settings-tab-${tab.id}`}
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={`practice-settings-panel-${tab.id}`}
      onClick={() => onSelect(tab.id)}
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-[13px] px-2 py-2 text-[13px] font-extrabold transition-colors outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/25',
        selected ? 'bg-brand-primary text-white shadow-[0_2px_0_var(--color-brand-primary-edge)]' : 'text-ui-muted-strong hover:bg-ui-surface hover:text-ui-ink-strong',
      )}
    >
      <AppIcon name={tab.icon} size={17} className="hidden shrink-0 sm:block" />
      <span className="whitespace-nowrap sm:hidden">{shortLabel}</span>
      <span className="hidden whitespace-nowrap sm:inline">{tab.label}</span>
    </button>
  );
}
