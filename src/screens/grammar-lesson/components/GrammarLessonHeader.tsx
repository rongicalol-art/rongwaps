import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AppIcon,
  IconActionButton,
  ScreenHeader,
} from '../../../lib/widgets';
import { GrammarReadingAids } from './GrammarReadingAids';

interface GrammarLessonHeaderProps {
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  currentStepIndex: number;
  totalSteps: number;
  progress: number;
  showReadingAids: boolean;
  onClose: () => void;
  onTogglePinyin: () => void;
  onToggleTranslation: () => void;
  onCharacterPreferenceChange: (preference: 'traditional' | 'simplified') => void;
}

export function GrammarLessonHeader({
  characterPreference,
  showPinyin,
  showTranslation,
  currentStepIndex,
  totalSteps,
  progress,
  showReadingAids,
  onClose,
  onTogglePinyin,
  onToggleTranslation,
  onCharacterPreferenceChange,
}: GrammarLessonHeaderProps) {
  const [isAidsOpen, setIsAidsOpen] = useState(false);
  const aidsRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isAidsOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!aidsRef.current?.contains(event.target as Node)) setIsAidsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAidsOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAidsOpen]);

  return (
    <div className="relative z-20 w-full bg-transparent pt-[env(safe-area-inset-top,0px)]">
      <ScreenHeader
        onClose={onClose}
        currentIndex={currentStepIndex}
        totalCount={totalSteps}
        progress={progress}
        maxWidth="4xl"
        progressSize="compact"
        progressAriaLabel="Grammar lesson progress"
        progressUnitLabel="steps"
        className="!h-auto !min-h-0 !border-0 !bg-transparent !px-4 !py-3 !shadow-none sm:!px-6 lg:!px-10"
        rightAction={
          showReadingAids ? (
            <div ref={aidsRef} className="relative">
              <IconActionButton
                size="md"
                onClick={() => setIsAidsOpen((open) => !open)}
                className={isAidsOpen ? 'text-brand-primary hover:text-brand-primary' : undefined}
                icon={(
                  <motion.span
                    animate={{ rotate: isAidsOpen ? 180 : 0 }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.15, ease: 'easeOut' }}
                  >
                    <AppIcon name="expand" size={20} />
                  </motion.span>
                )}
                label="Reading aids"
                title="Reading aids"
                aria-haspopup="menu"
                aria-expanded={isAidsOpen}
              />
              <AnimatePresence>
                {isAidsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
                    className="absolute right-0 top-full z-30 mt-2 w-44 rounded-[17px] border-b-4 border-ui-border bg-ui-surface p-0.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                  >
                    <GrammarReadingAids
                      characterPreference={characterPreference}
                      showPinyin={showPinyin}
                      showTranslation={showTranslation}
                      onCharacterPreferenceChange={onCharacterPreferenceChange}
                      onTogglePinyin={onTogglePinyin}
                      onToggleTranslation={onToggleTranslation}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <span aria-hidden="true" className="h-10 w-10 shrink-0" />
          )
        }
      />
    </div>
  );
}
