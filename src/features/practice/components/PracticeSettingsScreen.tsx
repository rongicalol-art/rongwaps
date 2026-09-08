import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { PracticePreferences } from '../../../store/usePracticePreferencesStore';
import { cn } from '../../../utils/cn';
import { ActionButton, AppIcon, IconActionButton, SegmentedControl } from '../../../lib/widgets';
import { QuizModeSettingsTab } from '../settings/QuizModeSettingsTab';
import { FlowModeSettingsTab } from '../settings/FlowModeSettingsTab';
import { GeneralSettingsTab } from '../settings/GeneralSettingsTab';
import { useModalFocus } from '../../../hooks/useModalFocus';

type SettingsTab = 'general' | 'quiz' | 'flow';

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
          {/* Dimmed theme-aware backdrop — covers the full viewport */}
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
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3 sm:p-6">
            {/* Centered responsive modal card with consistent fixed height */}
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="Practice settings"
              tabIndex={-1}
              onKeyDown={modalFocusProps.onKeyDown}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
              className="pointer-events-auto relative flex h-[520px] max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-canvas shadow-ambient-lg outline-none"
            >
              {/* Single Clean Header with General / Quiz / Flow Tabs + Close */}
              <header className="z-30 flex shrink-0 items-center gap-3 border-b border-ui-divider bg-ui-canvas/95 px-4 py-2.5 backdrop-blur sm:px-5">
                <div className="min-w-0 flex-1">
                  <SegmentedControl<SettingsTab>
                    value={activeTab}
                    onChange={setActiveTab}
                    ariaLabel="Practice settings tabs"
                    options={[
                      { value: 'general', label: 'General' },
                      { value: 'quiz', label: 'Quiz' },
                      { value: 'flow', label: 'Flow' },
                    ]}
                  />
                </div>
                <IconActionButton
                  onClick={onClose}
                  label="Close practice settings"
                  size="md"
                  icon={<AppIcon name="close" size={20} />}
                />
              </header>

              {/* Scrollable Content */}
              <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
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
                      {activeTab === 'general' && <GeneralSettingsTab {...tabProps} />}
                      {activeTab === 'quiz' && <QuizModeSettingsTab {...tabProps} />}
                      {activeTab === 'flow' && <FlowModeSettingsTab {...tabProps} />}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </main>

              {/* Footer */}
              <footer className="shrink-0 border-t border-ui-divider bg-ui-canvas px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3 sm:px-5">
                <ActionButton
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={onClose}
                  className="uppercase tracking-widest"
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
