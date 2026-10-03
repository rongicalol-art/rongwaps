import React from 'react';
import { SettingsDropdownPicker } from '../../../lib/widgets';
import type { CharacterFont } from '../../../store/useAppStore';
import { cn } from '../../../utils/cn';

export interface CharacterAppearanceSectionProps {
  characterPreference: 'traditional' | 'simplified';
  onCharacterPreferenceChange: (preference: 'traditional' | 'simplified') => void;
  characterFont: CharacterFont;
  onCharacterFontChange: (font: CharacterFont) => void;
  showPinyin?: boolean;
  showTranslation?: boolean;
}

const FONT_OPTIONS: Array<{ value: CharacterFont; label: string }> = [
  { value: 'huninn', label: 'Rounded (圓體)' },
  { value: 'kai', label: 'Kai (楷體)' },
];

export function CharacterAppearanceSection({
  characterPreference,
  onCharacterPreferenceChange,
  characterFont,
  onCharacterFontChange,
}: CharacterAppearanceSectionProps) {
  const isSimplified = characterPreference === 'simplified';

  const traditionalFontClass =
    characterFont === 'huninn' ? 'font-chinese-huninn font-normal' : 'font-kaiti-tc font-normal';
  const simplifiedFontClass =
    characterFont === 'huninn' ? 'font-chinese-rounded-sc font-normal' : 'font-kaiti-sc font-normal';

  return (
    <div className="flex flex-col gap-5 px-2" aria-label="Character settings">
      {/* 1. Font Style Dropdown Select */}
      <div>
        <SettingsDropdownPicker<CharacterFont>
          label="Font style"
          ariaLabel="Character font style"
          value={characterFont}
          options={FONT_OPTIONS}
          onChange={onCharacterFontChange}
        />
      </div>

      {/* 2. Character Script Choice Cards */}
      <div className="flex flex-col gap-2.5">
        <span className="block text-sm font-extrabold text-ui-ink">
          Script
        </span>
        <div
          role="radiogroup"
          aria-label="Character script"
          className="flex gap-3.5"
        >
          {/* Traditional Card */}
          <button
            type="button"
            role="radio"
            aria-checked={!isSimplified}
            aria-label="Traditional characters"
            onClick={() => onCharacterPreferenceChange('traditional')}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1.5 rounded-feature border-2 py-4 px-3 outline-none transition-all focus-ring active:translate-y-[length:var(--depth-sm)]',
              !isSimplified
                ? 'border-brand-primary bg-brand-primary-soft shadow-[0_var(--depth-md)_0_var(--color-brand-primary-edge)]'
                : 'border-ui-border bg-ui-surface shadow-[0_var(--depth-md)_0_var(--color-ui-border)] hover:bg-ui-hover',
            )}
          >
            <span
              className={cn(
                'font-chinese text-2xl sm:text-3xl leading-none transition-colors',
                traditionalFontClass,
                !isSimplified ? 'text-brand-primary-deep' : 'text-ui-muted-strong',
              )}
            >
              繁體
            </span>
            <span
              className={cn(
                'text-xs font-black uppercase tracking-wider transition-colors',
                !isSimplified ? 'text-brand-primary-deep' : 'text-ui-muted',
              )}
            >
              Traditional
            </span>
          </button>

          {/* Simplified Card */}
          <button
            type="button"
            role="radio"
            aria-checked={isSimplified}
            aria-label="Simplified characters"
            onClick={() => onCharacterPreferenceChange('simplified')}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1.5 rounded-feature border-2 py-4 px-3 outline-none transition-all focus-ring active:translate-y-[length:var(--depth-sm)]',
              isSimplified
                ? 'border-brand-primary bg-brand-primary-soft shadow-[0_var(--depth-md)_0_var(--color-brand-primary-edge)]'
                : 'border-ui-border bg-ui-surface shadow-[0_var(--depth-md)_0_var(--color-ui-border)] hover:bg-ui-hover',
            )}
          >
            <span
              className={cn(
                'font-chinese text-2xl sm:text-3xl leading-none transition-colors',
                simplifiedFontClass,
                isSimplified ? 'text-brand-primary-deep' : 'text-ui-muted-strong',
              )}
            >
              简体
            </span>
            <span
              className={cn(
                'text-xs font-black uppercase tracking-wider transition-colors',
                isSimplified ? 'text-brand-primary-deep' : 'text-ui-muted',
              )}
            >
              Simplified
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
