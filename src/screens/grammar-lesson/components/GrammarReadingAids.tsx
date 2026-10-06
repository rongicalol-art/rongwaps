import { SegmentedControl, SwitchRow } from '../../../lib/widgets';
import type { CharacterFont } from '../../../store/useAppStore';

interface GrammarReadingAidsProps {
  characterPreference: 'traditional' | 'simplified';
  characterFont: CharacterFont;
  showPinyin: boolean;
  showTranslation: boolean;
  onCharacterPreferenceChange: (preference: 'traditional' | 'simplified') => void;
  onCharacterFontChange: (font: CharacterFont) => void;
  onTogglePinyin: () => void;
  onToggleTranslation: () => void;
}

export function GrammarReadingAids({
  characterPreference,
  characterFont,
  showPinyin,
  showTranslation,
  onCharacterPreferenceChange,
  onCharacterFontChange,
  onTogglePinyin,
  onToggleTranslation,
}: GrammarReadingAidsProps) {
  return (
    <div className="flex flex-col gap-3 text-left">
      {/* Script Selection */}
      <div className="space-y-1.5">
        <span className="block px-1 text-xs font-black uppercase tracking-wider text-ui-muted-strong">
          Character Script
        </span>
        <SegmentedControl<'traditional' | 'simplified'>
          value={characterPreference}
          onChange={onCharacterPreferenceChange}
          ariaLabel="Character script preference"
          options={[
            { value: 'traditional', label: <span>Traditional</span> },
            { value: 'simplified', label: <span>Simplified</span> },
          ]}
        />
      </div>

      <div className="h-px bg-ui-divider" />

      {/* Character Font Selection */}
      <div className="space-y-1.5">
        <span className="block px-1 text-xs font-black uppercase tracking-wider text-ui-muted-strong">
          Character Font
        </span>
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

      <div className="h-px bg-ui-divider" />

      {/* Reading Aids Toggles */}
      <div className="space-y-1.5">
        <span className="block px-1 text-xs font-black uppercase tracking-wider text-ui-muted-strong">
          Reading Aids
        </span>
        <div role="menu" aria-label="Reading aids" className="flex flex-col gap-1.5">
          {/* Pinyin Toggle */}
          <SwitchRow label="Pinyin" checked={showPinyin} onToggle={onTogglePinyin} tinted />

          {/* Translation Toggle */}
          <SwitchRow label="Translation" checked={showTranslation} onToggle={onToggleTranslation} tinted />
        </div>
      </div>
    </div>
  );
}
