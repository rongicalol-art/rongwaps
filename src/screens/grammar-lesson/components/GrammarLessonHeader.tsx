import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AppIcon,
  IconActionButton,
  ScreenHeader,
} from '../../../lib/widgets';
import { GrammarReadingAids } from './GrammarReadingAids';
import type { CharacterFont } from '../../../store/usePracticePreferencesStore';

interface GrammarLessonHeaderProps {
  characterPreference: 'traditional' | 'simplified';
  characterFont: CharacterFont;
  showPinyin: boolean;
  showTranslation: boolean;
  currentStepIndex: number;
  totalSteps: number;
  progress: number;
  showReadingAids: boolean;
  hasConfusion?: boolean;
  isConfusionOpen?: boolean;
  onOpenConfusion?: () => void;
  onClose: () => void;
  onTogglePinyin: () => void;
  onToggleTranslation: () => void;
  onCharacterPreferenceChange: (preference: 'traditional' | 'simplified') => void;
  onCharacterFontChange: (font: CharacterFont) => void;
}

export function GrammarLessonHeader({
  characterPreference,
  characterFont,
  showPinyin,
  showTranslation,
  currentStepIndex,
  totalSteps,
  progress,
  showReadingAids,
  hasConfusion = false,
  isConfusionOpen = false,
  onOpenConfusion,
  onClose,
  onTogglePinyin,
  onToggleTranslation,
  onCharacterPreferenceChange,
  onCharacterFontChange,
}: GrammarLessonHeaderProps) {
  const [isAidsOpen, setIsAidsOpen] = useState(false);
  const aidsRef = useRef<HTMLDivElement>(null);

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
    <ScreenHeader
      variant="window"
      tone="canvas"
      onClose={onClose}
      currentIndex={currentStepIndex}
      totalCount={totalSteps}
      progress={progress}
      maxWidth="4xl"
      progressSize="compact"
      rightAction={
        <div className="flex items-center gap-1.5">
          {hasConfusion && onOpenConfusion && (
            <IconActionButton
              size="md"
              onClick={onOpenConfusion}
              className={isConfusionOpen ? 'text-brand-primary hover:text-brand-primary' : undefined}
              icon={<AppIcon name="lightbulb" size={20} />}
              label={isConfusionOpen ? "Hide confusion notes" : "Don't mix these up"}
              title={isConfusionOpen ? "Hide confusion notes" : "Don't mix these up"}
              aria-haspopup="dialog"
              aria-expanded={isConfusionOpen}
            />
          )}
          {showReadingAids ? (
            <div ref={aidsRef} className="relative">
              <IconActionButton
                size="md"
                onClick={() => setIsAidsOpen((open) => !open)}
                className={isAidsOpen ? 'text-brand-primary hover:text-brand-primary' : undefined}
                icon={<AppIcon name="menu" size={20} />}
                label="Lesson options"
                title="Lesson options"
                aria-haspopup="dialog"
                aria-expanded={isAidsOpen}
              />
              <AnimatePresence>
                {isAidsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
                    className="absolute right-0 top-full z-50 mt-2 w-64 sm:w-72 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-2.5 shadow-ambient-lg text-left"
                  >
                    <GrammarReadingAids
                      characterPreference={characterPreference}
                      characterFont={characterFont}
                      showPinyin={showPinyin}
                      showTranslation={showTranslation}
                      onCharacterPreferenceChange={onCharacterPreferenceChange}
                      onCharacterFontChange={onCharacterFontChange}
                      onTogglePinyin={onTogglePinyin}
                      onToggleTranslation={onToggleTranslation}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <span aria-hidden="true" className="h-10 w-10 shrink-0" />
          )}
        </div>
      }
    />
  );
}
