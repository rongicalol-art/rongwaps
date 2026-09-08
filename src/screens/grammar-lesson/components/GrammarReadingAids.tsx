import { SegmentedControl } from '../../../lib/widgets';
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

      {/* Reading Aids Toggles */}
      <div className="space-y-1.5">
        <span className="block px-1 text-xs font-black uppercase tracking-wider text-ui-muted-strong">
          Reading Aids
        </span>
        <div role="menu" aria-label="Reading aids" className="flex flex-col gap-1.5">
          {/* Pinyin Toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={showPinyin}
            onClick={onTogglePinyin}
            className={cn(
              'flex min-h-11 w-full items-center justify-between rounded-compact px-3 py-2 text-sm font-extrabold transition-colors outline-none focus-ring',
              showPinyin
                ? 'bg-brand-primary/10 text-brand-primary'
                : 'text-ui-ink-strong hover:bg-ui-hover',
            )}
          >
            <span>Pinyin</span>
            <span
              aria-hidden="true"
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out',
                showPinyin ? 'bg-brand-primary' : 'bg-ui-divider',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-4 w-4 rounded-full bg-ui-surface border-0 border-b-px border-b-ui-border ring-0 transition duration-200 ease-in-out translate-y-0.5',
                  showPinyin ? 'translate-x-[18px]' : 'translate-x-0.5',
                )}
              />
            </span>
          </button>

          {/* Translation Toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={showTranslation}
            onClick={onToggleTranslation}
            className={cn(
              'flex min-h-11 w-full items-center justify-between rounded-compact px-3 py-2 text-sm font-extrabold transition-colors outline-none focus-ring',
              showTranslation
                ? 'bg-brand-primary/10 text-brand-primary'
                : 'text-ui-ink-strong hover:bg-ui-hover',
            )}
          >
            <span>Translation</span>
            <span
              aria-hidden="true"
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out',
                showTranslation ? 'bg-brand-primary' : 'bg-ui-divider',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-4 w-4 rounded-full bg-ui-surface border-0 border-b-px border-b-ui-border ring-0 transition duration-200 ease-in-out translate-y-0.5',
                  showTranslation ? 'translate-x-[18px]' : 'translate-x-0.5',
                )}
              />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
