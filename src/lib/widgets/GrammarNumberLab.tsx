import { useState } from 'react';
import type { GrammarNumberLab as GrammarNumberLabData, GrammarWordToken } from '../../types/models';
import { audioService } from '../../services/audioService';
import { AppIcon } from './AppIcon';
import { GrammarFocusText } from './GrammarFocusText';
import { GrammarLabShell } from './GrammarLabShell';
import { IconActionButton } from './IconActionButton';
import { SegmentedControl } from './SegmentedControl';

export interface GrammarNumberLabProps extends React.HTMLAttributes<HTMLElement> {
  lab: GrammarNumberLabData;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
}

export function GrammarNumberLab({
  lab,
  characterPreference,
  showPinyin,
  showTranslation,
  contextTokens,
  onOpenWord,
  className,
  ...props
}: GrammarNumberLabProps) {
  const [selectedId, setSelectedId] = useState(lab.choices[0].id);
  const selected = lab.choices.find((choice) => choice.id === selectedId) ?? lab.choices[0];
  const sentence = characterPreference === 'simplified' && selected.simplified
    ? selected.simplified
    : selected.traditional;

  return (
    <GrammarLabShell
      aria-label={lab.title}
      eyebrow="Build it"
      title={(
        <GrammarFocusText
          text={lab.title}
          contextTokens={contextTokens}
          characterPreference={characterPreference}
          onOpenWord={onOpenWord}
        />
      )}
      description={(
        <GrammarFocusText
          text={lab.description}
          contextTokens={contextTokens}
          characterPreference={characterPreference}
          onOpenWord={onOpenWord}
        />
      )}
      takeaway={(
        <GrammarFocusText
          text={lab.takeaway}
          contextTokens={contextTokens}
          characterPreference={characterPreference}
          onOpenWord={onOpenWord}
        />
      )}
      className={className}
      {...props}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="shrink-0 text-sm font-black text-ui-ink">{lab.prompt}</p>
        <SegmentedControl
          value={selected.id}
          onChange={setSelectedId}
          ariaLabel={lab.prompt}
          options={lab.choices.map((choice) => ({ value: choice.id, label: choice.label }))}
          className="w-full flex-wrap sm:max-w-3xl sm:flex-nowrap [&>button]:basis-[calc(50%-0.25rem)] sm:[&>button]:basis-0"
        />
      </div>

      <div className="mt-5 rounded-[22px] border border-ui-border bg-ui-surface p-5 shadow-[0_3px_0_var(--color-ui-border)] sm:p-7">
        <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(250px,0.8fr)] sm:items-center">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.08em] text-ui-muted-strong">{selected.digits}</p>
                <p className="mt-1 font-chinese text-[28px] font-black leading-relaxed text-ui-ink-strong sm:text-[34px]">
                  <GrammarFocusText text={sentence} variant="sentence" contextTokens={contextTokens} characterPreference={characterPreference} onOpenWord={onOpenWord} />
                </p>
                {showPinyin && <p className="text-xs font-bold text-brand-primary sm:text-sm">{selected.pinyin}</p>}
                {showTranslation && <p className="mt-1.5 text-sm font-black text-ui-ink sm:text-base">{selected.english}</p>}
              </div>
              <IconActionButton
                onClick={() => audioService.speakText(sentence, characterPreference === 'traditional' ? 'zh-TW' : 'zh-CN', 0.78)}
                variant="quiet"
                size="sm"
                icon={<AppIcon name="audio" size={16} />}
                label={`Listen to ${selected.label}`}
                className="text-ui-muted hover:text-brand-primary"
              />
            </div>
          </div>

          <div className="grid auto-rows-fr grid-cols-2 gap-px overflow-hidden rounded-[16px] border border-ui-divider bg-ui-divider">
            {selected.groups.map((group, index) => {
              const groupText = characterPreference === 'simplified' && group.simplified
                ? group.simplified
                : group.traditional;
              return (
                <div
                  key={`${selected.id}-${group.label}`}
                  className={`bg-ui-canvas px-3 py-3 ${selected.groups.length % 2 === 1 && index === selected.groups.length - 1 ? 'col-span-2' : ''}`}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.08em] text-ui-muted-strong">{group.label}</p>
                  <p className="mt-1 text-lg font-black text-ui-ink-strong">{group.digit}</p>
                  <p className="font-chinese text-sm font-black text-brand-primary">
                    <GrammarFocusText text={groupText} contextTokens={contextTokens} characterPreference={characterPreference} onOpenWord={onOpenWord} />
                  </p>
                </div>
              );
            })}
          </div>
        </div>
        <p className="mt-5 border-t border-ui-divider pt-4 text-sm font-bold leading-6 text-ui-muted-strong">{selected.note}</p>
      </div>
    </GrammarLabShell>
  );
}
