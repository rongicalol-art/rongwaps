import type { RefObject } from 'react';
import { AppIcon, ScreenHeader, SettingsPopover } from '../../../lib/widgets';
import { GrammarReadingAids } from './GrammarReadingAids';
import type { CharacterFont } from '../../../store/useAppStore';
import type { GrammarExplanationView } from './GrammarStudyPage';
import { GlobalPresenceButton } from '../../../features/social';

interface GrammarLessonHeaderProps {
  title?: string;
  characterFont: CharacterFont;
  onCharacterFontChange: (font: CharacterFont) => void;
  showPinyin: boolean;
  showTranslation: boolean;
  currentStepIndex: number;
  totalSteps: number;
  progress: number;
  showReadingAids: boolean;
  onClose: () => void;
  onTogglePinyin: () => void;
  onToggleTranslation: () => void;
  /** Label for the printed-book page(s) this grammar point covers; null hides the button. */
  bookPageLabel?: string | null;
  onOpenBookPage?: () => void;
  bookPageButtonRef?: RefObject<HTMLButtonElement | null>;
  explanationView?: GrammarExplanationView;
  explanationViews?: GrammarExplanationView[];
  onExplanationViewChange?: (view: GrammarExplanationView) => void;
}

export function GrammarLessonHeader({
  title,
  characterFont,
  onCharacterFontChange,
  showPinyin,
  showTranslation,
  progress,
  showReadingAids,
  onClose,
  onTogglePinyin,
  onToggleTranslation,
  bookPageLabel = null,
  onOpenBookPage,
  bookPageButtonRef,
  explanationView,
  explanationViews,
  onExplanationViewChange,
}: GrammarLessonHeaderProps) {
  return (
    <ScreenHeader
      variant="window"
      tone="canvas"
      onBack={onClose}
      title={title}
      progress={progress}
      maxWidth="none"
      controlSize="lg"
      rightAction={
        <div className="flex items-center gap-2">
          <GlobalPresenceButton />
          {showReadingAids ? (
            <SettingsPopover
              ref={bookPageButtonRef}
              size="lg"
              triggerClassName={(open) => (open ? 'text-brand-primary hover:text-brand-primary' : undefined)}
              icon={<AppIcon name="menu" size={25} />}
              label="Lesson options"
              title="Lesson options"
            >
              {(close) => (
                <GrammarReadingAids
                  characterFont={characterFont}
                  onCharacterFontChange={onCharacterFontChange}
                  bookPageLabel={bookPageLabel}
                  onOpenBookPage={onOpenBookPage ? () => { close(); onOpenBookPage(); } : undefined}
                  showPinyin={showPinyin}
                  showTranslation={showTranslation}
                  onTogglePinyin={onTogglePinyin}
                  onToggleTranslation={onToggleTranslation}
                  explanationView={explanationView}
                  explanationViews={explanationViews}
                  onExplanationViewChange={onExplanationViewChange}
                />
              )}
            </SettingsPopover>
          ) : (
            <span aria-hidden="true" className="h-10 w-10 shrink-0" />
          )}
        </div>
      }
    />
  );
}
