import { AppIcon, SegmentedControl } from '../../../lib/widgets';
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
    <div className="flex flex-col gap-4 text-left">
      <div>
        <div className="flex items-center gap-2">
          <AppIcon name="settings" size={16} className="text-brand-primary" />
          <h3 className="text-sm font-black text-ui-ink-strong">Display Settings</h3>
        </div>
        <p className="mt-0.5 text-xs font-bold text-ui-muted">Customize how grammar content appears</p>
      </div>

      <div className="space-y-1.5">
        <span className="block text-[11px] font-black uppercase tracking-wider text-ui-muted-strong">
          Character Script
        </span>
        <SegmentedControl
          value={characterPreference}
          onChange={onCharacterPreferenceChange}
          ariaLabel="Character script format"
          options={[
            { value: 'traditional', label: <span>Traditional (繁體)</span> },
            { value: 'simplified', label: <span>Simplified (简体)</span> },
          ]}
        />
      </div>

      <div className="space-y-2">
        <span className="block text-[11px] font-black uppercase tracking-wider text-ui-muted-strong">
          Reading Aids
        </span>
        <div className="overflow-hidden rounded-xl bg-ui-hover/60 divide-y divide-ui-divider/70">
          {/* Pinyin Toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={showPinyin}
            onClick={onTogglePinyin}
            className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors outline-none hover:bg-ui-surface-hover focus-visible:bg-ui-surface-hover"
          >
            <div className="min-w-0">
              <span className="block text-xs font-black text-ui-ink-strong">Pinyin</span>
              <span className="block text-[11px] font-bold text-ui-muted">Pronunciation above characters</span>
            </div>
            <span
              aria-hidden="true"
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out',
                showPinyin ? 'bg-brand-primary' : 'bg-ui-hover',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 rounded-full bg-ui-surface border-b-[length:var(--depth-sm)] border-ui-divider ring-0 transition duration-200 ease-in-out',
                  showPinyin ? 'translate-x-5' : 'translate-x-0',
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
            className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors outline-none hover:bg-ui-surface-hover focus-visible:bg-ui-surface-hover"
          >
            <div className="min-w-0">
              <span className="block text-xs font-black text-ui-ink-strong">Translations</span>
              <span className="block text-[11px] font-bold text-ui-muted">English sentence meanings</span>
            </div>
            <span
              aria-hidden="true"
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out',
                showTranslation ? 'bg-brand-primary' : 'bg-ui-hover',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 rounded-full bg-ui-surface border-b-[length:var(--depth-sm)] border-ui-divider ring-0 transition duration-200 ease-in-out',
                  showTranslation ? 'translate-x-5' : 'translate-x-0',
                )}
              />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
