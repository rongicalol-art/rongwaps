import { AppIcon, SegmentedControl, SwitchRow } from '../../../lib/widgets';
import type { CharacterFont } from '../../../store/useAppStore';

interface GrammarReadingAidsProps {
  characterFont: CharacterFont;
  onCharacterFontChange: (font: CharacterFont) => void;
  showPinyin: boolean;
  showTranslation: boolean;
  onTogglePinyin: () => void;
  onToggleTranslation: () => void;
  bookPageLabel?: string | null;
  onOpenBookPage?: () => void;
}

export function GrammarReadingAids({
  characterFont,
  onCharacterFontChange,
  showPinyin,
  showTranslation,
  onTogglePinyin,
  onToggleTranslation,
  bookPageLabel,
  onOpenBookPage,
}: GrammarReadingAidsProps) {
  return (
    <div role="menu" aria-label="Lesson options" className="flex flex-col gap-1.5 text-left">
      <SwitchRow label="Pinyin" checked={showPinyin} onToggle={onTogglePinyin} tinted />
      <SwitchRow label="Translation" checked={showTranslation} onToggle={onToggleTranslation} tinted />
      <div className="my-1 flex flex-col gap-2">
        <SegmentedControl<CharacterFont>
          value={characterFont}
          onChange={onCharacterFontChange}
          ariaLabel="Character font preference"
          options={[
            { value: 'huninn', label: <span>Rounded</span> },
            { value: 'kai', label: <span>Kai</span> },
          ]}
        />
      </div>
      {bookPageLabel && onOpenBookPage && (
        <button
          type="button"
          onClick={onOpenBookPage}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-compact px-3 py-2 text-sm font-extrabold text-ui-ink-strong outline-none transition-colors hover:bg-ui-hover focus-ring"
        >
          <span>{bookPageLabel}</span>
          <AppIcon name="next" size={16} />
        </button>
      )}
    </div>
  );
}
