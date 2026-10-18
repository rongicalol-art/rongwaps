import type { CharacterFont } from '../../../store/useAppStore';
import { cn } from '../../../utils/cn';

export interface CharacterAppearanceSectionProps {
  characterFont: CharacterFont;
  onCharacterFontChange: (font: CharacterFont) => void;
}

const FONT_OPTIONS: Array<{ value: CharacterFont; label: string; fontClass: string }> = [
  { value: 'huninn', label: 'Rounded 圓體', fontClass: 'font-chinese-huninn' },
  { value: 'kai', label: 'Kai 楷體', fontClass: 'font-kaiti-tc' },
];

/** Character font picker: two tactile tiles, each previewing 學 in its font. */
export function CharacterAppearanceSection({ characterFont, onCharacterFontChange }: CharacterAppearanceSectionProps) {
  return (
    <div role="radiogroup" aria-label="Character font" className="grid grid-cols-2 gap-3 px-2">
      {FONT_OPTIONS.map(({ value, label, fontClass }) => {
        const isSelected = characterFont === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onCharacterFontChange(value)}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-control border-2 border-b-[length:var(--depth-md)] px-2.5 pb-3 pt-3.5 outline-none transition-colors focus-ring',
              isSelected
                ? 'border-brand-primary border-b-brand-primary-edge bg-brand-primary-soft'
                : 'border-ui-border bg-ui-surface hover:bg-ui-hover',
            )}
          >
            <span className={cn(fontClass, 'text-[58px] font-normal leading-[1.15] text-ui-ink-strong')}>學</span>
            <span className={cn('text-sm font-bold', isSelected ? 'text-brand-primary-edge' : 'text-ui-muted-strong')}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
