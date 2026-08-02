import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { PracticePreferences, PracticePreset } from '../../store/usePracticePreferencesStore';
import { cn } from '../../utils/cn';
import { AppIcon, type AppIconName } from './AppIcon';
import { Soft3DButton } from './Soft3DButton';
import { ScreenHeader } from './ScreenHeader';
import { AnswerSettingsTab } from './practice-settings/AnswerSettingsTab';
import { AudioSettingsTab } from './practice-settings/AudioSettingsTab';
import { PaceSettingsTab } from './practice-settings/PaceSettingsTab';
import { SessionSettingsTab } from './practice-settings/SessionSettingsTab';
import { useModalFocus } from '../../hooks/useModalFocus';

type SettingsTab = 'pace' | 'answers' | 'audio' | 'session';

const TABS: Array<{ id: SettingsTab; label: string; icon: AppIconName }> = [
  { id: 'pace', label: 'Pace', icon: 'clock' },
  { id: 'answers', label: 'Answers', icon: 'check' },
  { id: 'audio', label: 'Audio', icon: 'audio' },
  { id: 'session', label: 'Session', icon: 'cards' },
];

export interface PracticeSettingsScreenProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
  preferences: PracticePreferences;
  onPreferencesChange: (preferences: Partial<PracticePreferences>) => void;
  onPaceChange: (pace: number) => void;
  onApplyPreset: (preset: Exclude<PracticePreset, 'custom'>) => void;
  characterPreference: 'traditional' | 'simplified';
  onCharacterPreferenceChange: (preference: 'traditional' | 'simplified') => void;
}

export function PracticeSettingsScreen({
  isOpen,
  onClose,
  preferences,
  onPreferencesChange,
  onPaceChange,
  onApplyPreset,
  characterPreference,
  onCharacterPreferenceChange,
  className,
  ...props
}: PracticeSettingsScreenProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('pace');
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const modalFocusProps = useModalFocus({
    containerRef: dialogRef,
    isActive: isOpen,
    onEscape: onClose,
  });

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('pace');
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  const tabProps = {
    preferences,
    onChange: onPreferencesChange,
    onPaceChange,
    onApplyPreset,
    characterPreference,
    onCharacterPreferenceChange,
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="practice-settings-title"
          tabIndex={-1}
          onKeyDown={modalFocusProps.onKeyDown}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 12 }}
          transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
          className="workspace-window fixed inset-0 z-[400] flex flex-col overflow-hidden bg-ui-practice-canvas outline-none"
        >
          <ScreenHeader
            onClose={onClose}
            maxWidth="none"
            centerContent={(
              <div className="text-center">
                <h2 id="practice-settings-title" className="text-lg font-black text-ui-ink sm:text-xl">Practice settings</h2>
                <p className="hidden text-xs font-bold text-ui-muted sm:block">Make the round move at your speed.</p>
              </div>
            )}
            className="relative z-20 border-b-0 bg-transparent shadow-none"
          />

          <nav aria-label="Practice settings sections" className="relative z-10 shrink-0 bg-transparent px-3 py-2 md:hidden">
            <div className="mx-auto grid max-w-xl grid-cols-4 gap-1" role="tablist">
              {TABS.map((tab) => <SettingsTabButton key={tab.id} tab={tab} selected={activeTab === tab.id} onSelect={setActiveTab} compact />)}
            </div>
          </nav>

          <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-8">
            <div className={cn('mx-auto grid w-full max-w-5xl gap-8 md:grid-cols-[190px_minmax(0,1fr)]', className)} {...props}>
              <nav aria-label="Practice settings sections" className="hidden md:block">
                <div className="sticky top-0 flex flex-col gap-2" role="tablist">
                  {TABS.map((tab) => <SettingsTabButton key={tab.id} tab={tab} selected={activeTab === tab.id} onSelect={setActiveTab} />)}
                </div>
              </nav>
              <section id={`practice-settings-panel-${activeTab}`} role="tabpanel" aria-labelledby={`practice-settings-tab-${activeTab}`} className="mx-auto w-full max-w-2xl">
                {activeTab === 'pace' && <PaceSettingsTab {...tabProps} />}
                {activeTab === 'answers' && <AnswerSettingsTab {...tabProps} />}
                {activeTab === 'audio' && <AudioSettingsTab {...tabProps} />}
                {activeTab === 'session' && <SessionSettingsTab {...tabProps} />}
              </section>
            </div>
          </main>

          <footer className="pointer-events-none relative z-20 shrink-0 bg-gradient-to-t from-ui-practice-canvas via-ui-practice-canvas/95 to-transparent px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-8 md:px-6">
            <Soft3DButton variant="custom" depth="sm" onClick={onClose} className="pointer-events-auto mx-auto max-w-5xl border-[#1899D6] bg-[#1CB0F6] py-3 text-white">Done</Soft3DButton>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function SettingsTabButton({ tab, selected, onSelect, compact = false }: { tab: (typeof TABS)[number]; selected: boolean; onSelect: (tab: SettingsTab) => void; compact?: boolean }) {
  return (
    <button
      id={`practice-settings-tab-${tab.id}`}
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={`practice-settings-panel-${tab.id}`}
      onClick={() => onSelect(tab.id)}
      className={cn(
        'flex items-center rounded-[16px] border-b-2 font-extrabold transition-all outline-none active:translate-y-[4px] active:border-b-0 focus-visible:ring-4 focus-visible:ring-[#BFE9FF]',
        compact ? 'flex-col justify-center gap-0.5 px-1 py-2 text-[11px]' : 'gap-3 px-4 py-3 text-sm',
        selected ? 'border-[#1899D6] bg-[#EAF7FF] text-[#1899D6]' : 'border-ui-border bg-ui-surface text-ui-muted',
      )}
    >
      <AppIcon name={tab.icon} size={compact ? 19 : 21} />
      <span>{tab.label}</span>
    </button>
  );
}
