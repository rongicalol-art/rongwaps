import { ActionButton } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

interface GrammarReadingAidsProps {
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  onCharacterPreferenceChange: (preference: 'traditional' | 'simplified') => void;
  onTogglePinyin: () => void;
  onToggleTranslation: () => void;
}

export function GrammarReadingAids({
  characterPreference,
  showPinyin,
  showTranslation,
  onCharacterPreferenceChange,
  onTogglePinyin,
  onToggleTranslation,
}: GrammarReadingAidsProps) {
  const itemClass = (isActive: boolean) => cn(
    'w-full justify-start gap-2.5 px-3 py-2 text-left text-ui-ink-strong',
    isActive && 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/15 hover:text-brand-primary',
  );

  return (
    <div role="menu" aria-label="Reading aids" className="flex w-full flex-col gap-1 p-1.5">
      <ActionButton
        role="menuitem"
        variant="quiet"
        size="sm"
        fullWidth
        aria-pressed={characterPreference === 'traditional'}
        onClick={() => onCharacterPreferenceChange('traditional')}
        className={itemClass(characterPreference === 'traditional')}
      >
        繁體
      </ActionButton>
      <ActionButton
        role="menuitem"
        variant="quiet"
        size="sm"
        fullWidth
        aria-pressed={characterPreference === 'simplified'}
        onClick={() => onCharacterPreferenceChange('simplified')}
        className={itemClass(characterPreference === 'simplified')}
      >
        简体
      </ActionButton>
      <ActionButton
        role="menuitem"
        variant="quiet"
        size="sm"
        fullWidth
        aria-pressed={showPinyin}
        onClick={onTogglePinyin}
        className={itemClass(showPinyin)}
      >
        Pinyin {showPinyin ? 'on' : 'off'}
      </ActionButton>
      <ActionButton
        role="menuitem"
        variant="quiet"
        size="sm"
        fullWidth
        aria-pressed={showTranslation}
        onClick={onToggleTranslation}
        className={itemClass(showTranslation)}
      >
        Definitions {showTranslation ? 'on' : 'off'}
      </ActionButton>
    </div>
  );
}
