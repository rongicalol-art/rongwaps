import { useEffect, useRef, useState } from 'react';
import { AppIcon, CustomProgressBar, IconActionButton, ScreenHeader } from '../../../lib/widgets';
import { GrammarReadingAids } from './GrammarReadingAids';

interface GrammarLessonHeaderProps {
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  grammarIndex: number;
  grammarCount: number;
  lessonId: number;
  partId: number;
  grammarNumber: number;
  grammarTotal: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  showReadingAids: boolean;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onTogglePinyin: () => void;
  onToggleTranslation: () => void;
  onCharacterPreferenceChange: (preference: 'traditional' | 'simplified') => void;
}

export function GrammarLessonHeader({
  characterPreference,
  showPinyin,
  showTranslation,
  grammarIndex,
  grammarCount,
  lessonId,
  partId,
  grammarNumber,
  grammarTotal,
  canGoPrevious,
  canGoNext,
  showReadingAids,
  onClose,
  onPrevious,
  onNext,
  onTogglePinyin,
  onToggleTranslation,
  onCharacterPreferenceChange,
}: GrammarLessonHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const progress = ((grammarIndex + 1) / grammarCount) * 100;
  useEffect(() => {
    if (!isExpanded) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setIsExpanded(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsExpanded(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded]);

  return (
    <div ref={headerRef} className="relative z-30 shrink-0 bg-transparent">
      <ScreenHeader
        onClose={onClose}
        maxWidth="none"
        centerContent={(
          <div className="w-full min-w-0 text-left">
            <p className="truncate text-[10px] font-black leading-none text-brand-primary">
              Lesson {lessonId} · Part {partId}
            </p>
            <h1 className="mt-0.5 truncate text-sm font-black leading-tight text-ui-ink-strong sm:text-base">
              Grammar {grammarNumber} of {grammarTotal}
            </h1>
            <CustomProgressBar progress={progress} size="sm" className="mt-1 max-w-3xl" />
          </div>
        )}
        rightAction={(
          <div className="flex items-center gap-0.5 sm:gap-1">
            {showReadingAids && (
              <IconActionButton
                size="sm"
                onClick={() => setIsExpanded((expanded) => !expanded)}
                icon={<AppIcon name="settings" size={20} />}
                label="Reading aids"
                aria-expanded={isExpanded}
                aria-controls="grammar-reading-aids"
                className={isExpanded ? 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/15 hover:text-brand-primary' : undefined}
              />
            )}
            <IconActionButton
              size="sm"
              disabled={!canGoPrevious}
              onClick={onPrevious}
              icon={<AppIcon name="back" size={21} />}
              label="Previous grammar"
            />
            <IconActionButton
              size="sm"
              disabled={!canGoNext}
              onClick={onNext}
              icon={<AppIcon name="forward" size={21} />}
              label="Next grammar"
            />
          </div>
        )}
        className="border-b-0 bg-transparent shadow-none"
      />

      {showReadingAids && (
        <GrammarReadingAids
          isExpanded={isExpanded}
          characterPreference={characterPreference}
          showPinyin={showPinyin}
          showTranslation={showTranslation}
          onCharacterPreferenceChange={onCharacterPreferenceChange}
          onTogglePinyin={onTogglePinyin}
          onToggleTranslation={onToggleTranslation}
        />
      )}
    </div>
  );
}
