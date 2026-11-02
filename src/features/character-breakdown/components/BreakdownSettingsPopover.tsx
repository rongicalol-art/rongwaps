import { SettingsPopover, SwitchRow } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';

/**
 * Contextual display settings for the character-breakdown window. For now it
 * surfaces the study preference that governs example-sentence pinyin; future
 * breakdown display toggles slot into the same switch list.
 */
export function BreakdownSettingsPopover() {
  const hideExamplePinyin = useAppStore((state) => state.hideExamplePinyin);
  const updatePreferences = useAppStore((state) => state.updatePreferences);

  return (
    <SettingsPopover
      size="lg"
      triggerClassName={(open) => (open ? 'h-10 w-10 bg-ui-hover' : 'h-10 w-10')}
      icon={(
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="text-ui-muted">
          <circle cx="12" cy="5" r="1.9" />
          <circle cx="12" cy="12" r="1.9" />
          <circle cx="12" cy="19" r="1.9" />
        </svg>
      )}
      label="Breakdown settings"
    >
      <div role="menu" aria-label="Breakdown display" className="flex flex-col gap-1.5">
        <SwitchRow label="Hide pinyin on example sentences" checked={hideExamplePinyin} onToggle={() => updatePreferences({ hideExamplePinyin: !hideExamplePinyin })} />
      </div>
    </SettingsPopover>
  );
}
