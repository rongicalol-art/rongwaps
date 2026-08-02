import { useState } from 'react';
import {
  ActionButton,
  AppIcon,
  ContextualChineseText,
  IconActionButton,
} from '../../../lib/widgets';
import { audioService } from '../../../services/audioService';
import type { InteractiveReadingPart } from '../../../types/models';
import { cn } from '../../../utils/cn';

interface ReadingTimelineExplorePageProps {
  part: InteractiveReadingPart;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  onTogglePinyin: () => void;
  onToggleTranslation: () => void;
  onCharacterPreferenceChange: (preference: 'traditional' | 'simplified') => void;
  onOpenWord: (word: string) => void;
}

const periodClasses = {
  morning: 'bg-[#FFF3C4] text-[#8A5A00]',
  noon: 'bg-[#EAF7FF] text-brand-primary',
  afternoon: 'bg-[#E8F9DC] text-[#3E8500]',
  evening: 'bg-[#FDE8F1] text-[#B83269]',
};

export function ReadingTimelineExplorePage({
  part,
  characterPreference,
  showPinyin,
  showTranslation,
  onTogglePinyin,
  onToggleTranslation,
  onCharacterPreferenceChange,
  onOpenWord,
}: ReadingTimelineExplorePageProps) {
  const timeline = part.timeline ?? [];
  const [selectedId, setSelectedId] = useState(timeline[0]?.id ?? '');
  const selected = timeline.find((item) => item.id === selectedId) ?? timeline[0];

  if (!selected) return null;

  const selectedChinese = characterPreference === 'simplified'
    ? selected.simplified
    : selected.traditional;

  return (
    <section className="mx-auto w-full max-w-5xl" aria-labelledby="timeline-title">
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.08em] text-brand-primary">Explore her day</p>
          <h2 id="timeline-title" className="mt-1 font-chinese text-[30px] font-black leading-tight text-ui-ink-strong sm:text-[38px]">
            <ContextualChineseText
              text={characterPreference === 'simplified' ? '友美做什么？' : part.titleTraditional}
              tokens={part.teachingGlossary}
              characterPreference={characterPreference}
              onOpenWord={onOpenWord}
            />
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-bold leading-relaxed text-ui-muted sm:text-base">
            {part.introduction}
          </p>

          <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {timeline.map((item) => (
              <ActionButton
                key={item.id}
                variant="secondary"
                size="sm"
                aria-pressed={item.id === selected.id}
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  'min-h-14 flex-col gap-0 px-2',
                  item.id === selected.id
                    && 'border-brand-primary bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/15 hover:text-brand-primary',
                )}
              >
                <span className="text-base font-black tabular-nums">{item.time}</span>
                <span className="text-[10px] capitalize">{item.period}</span>
              </ActionButton>
            ))}
          </div>

          <article className="mt-4 rounded-[22px] border border-ui-divider bg-ui-surface p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <span className={cn('rounded-full px-3 py-1 text-xs font-black capitalize', periodClasses[selected.period])}>
                {selected.period} · {selected.time}
              </span>
              <IconActionButton
                size="sm"
                variant="surface"
                onClick={() => audioService.speakText(selectedChinese, characterPreference === 'traditional' ? 'zh-TW' : 'zh-CN', 0.84)}
                icon={<AppIcon name="audio" size={18} />}
                label={`Listen to the ${selected.time} activity`}
                className="text-brand-primary"
              />
            </div>
            <p className="mt-5 font-chinese text-[25px] font-black leading-relaxed text-ui-ink-strong sm:text-[30px]">
              <ContextualChineseText
                text={selectedChinese}
                tokens={part.teachingGlossary}
                characterPreference={characterPreference}
                onOpenWord={onOpenWord}
              />
            </p>
            {showPinyin && <p className="mt-1 text-sm font-extrabold text-brand-primary">{selected.pinyin}</p>}
            {showTranslation && <p className="mt-2 text-sm font-bold text-ui-muted">{selected.english}</p>}
          </article>
        </div>

        <aside className="rounded-[20px] border border-ui-divider bg-ui-surface p-4 lg:sticky lg:top-0">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-ui-muted">Reading aids</p>
          <div className="mt-3 space-y-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              <ActionButton variant="quiet" size="sm" aria-pressed={characterPreference === 'traditional'} onClick={() => onCharacterPreferenceChange('traditional')} className={cn(characterPreference === 'traditional' && 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/15 hover:text-brand-primary')}>
                繁體
              </ActionButton>
              <ActionButton variant="quiet" size="sm" aria-pressed={characterPreference === 'simplified'} onClick={() => onCharacterPreferenceChange('simplified')} className={cn(characterPreference === 'simplified' && 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/15 hover:text-brand-primary')}>
                简体
              </ActionButton>
            </div>
            <ActionButton variant="quiet" size="sm" fullWidth aria-pressed={showPinyin} onClick={onTogglePinyin} className={cn('justify-start', showPinyin && 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/15 hover:text-brand-primary')}>
              Pinyin {showPinyin ? 'on' : 'off'}
            </ActionButton>
            <ActionButton variant="quiet" size="sm" fullWidth aria-pressed={showTranslation} onClick={onToggleTranslation} className={cn('justify-start', showTranslation && 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/15 hover:text-brand-primary')}>
              Meaning {showTranslation ? 'on' : 'off'}
            </ActionButton>
          </div>
          <p className="mt-5 border-t border-ui-divider pt-4 text-xs font-bold leading-relaxed text-ui-muted">
            Printed pages {part.printedPages.join('–')} · Audio {part.audioReference}
          </p>
        </aside>
      </div>
    </section>
  );
}
