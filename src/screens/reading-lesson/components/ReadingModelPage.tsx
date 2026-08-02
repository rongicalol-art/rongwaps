import { ActionButton, AppIcon, IconActionButton } from '../../../lib/widgets';
import { audioService } from '../../../services/audioService';
import type { InteractiveReadingPart } from '../../../types/models';
import { cn } from '../../../utils/cn';

interface ReadingModelPageProps {
  part: InteractiveReadingPart;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  onTogglePinyin: () => void;
  onToggleTranslation: () => void;
  onCharacterPreferenceChange: (preference: 'traditional' | 'simplified') => void;
}

const roleClasses = [
  'bg-[#EAF7FF] text-brand-primary',
  'bg-[#FFF3C4] text-[#A66A00]',
  'bg-[#E8F9DC] text-[#3E8500]',
  'bg-[#FDE8F1] text-[#B83269]',
  'bg-[#EEE9FF] text-[#6B4CC2]',
];

export function ReadingModelPage({
  part,
  characterPreference,
  showPinyin,
  showTranslation,
  onTogglePinyin,
  onToggleTranslation,
  onCharacterPreferenceChange,
}: ReadingModelPageProps) {
  const completeText = part.chunks
    .map((chunk) => characterPreference === 'simplified' ? chunk.simplified : chunk.traditional)
    .join('');

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_250px] lg:gap-10">
        <section aria-labelledby="reading-title">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-brand-primary">Model introduction</p>
              <h2 id="reading-title" className="mt-1 font-chinese text-[30px] font-black leading-tight text-ui-ink-strong sm:text-[38px]">
                {part.titleTraditional}
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-bold leading-relaxed text-ui-muted sm:text-base">
                {part.introduction}
              </p>
            </div>
            <IconActionButton
              size="sm"
              variant="surface"
              onClick={() => audioService.speakText(completeText, characterPreference === 'traditional' ? 'zh-TW' : 'zh-CN', 0.84)}
              icon={<AppIcon name="audio" size={21} />}
              label="Listen to the complete introduction"
              className="text-brand-primary"
            />
          </div>

          <div className="mt-7 overflow-hidden rounded-[20px] border border-ui-divider bg-ui-surface">
            {part.chunks.map((chunk, index) => {
              const chinese = characterPreference === 'simplified' ? chunk.simplified : chunk.traditional;
              return (
                <article
                  key={chunk.id}
                  className="grid gap-2 border-b-2 border-ui-divider px-4 py-4 last:border-b-0 sm:grid-cols-[92px_minmax(0,1fr)_40px] sm:items-start sm:gap-4 sm:px-5"
                >
                  <span className={cn('w-fit rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.07em]', roleClasses[index])}>
                    {chunk.role}
                  </span>
                  <div className="min-w-0">
                    <p className="font-chinese text-[21px] font-bold leading-[1.65] text-ui-ink-strong sm:text-[23px]">{chinese}</p>
                    {showPinyin && <p className="mt-0.5 text-sm font-extrabold leading-relaxed text-brand-primary">{chunk.pinyin}</p>}
                    {showTranslation && <p className="mt-1 text-sm font-bold leading-relaxed text-ui-muted">{chunk.english}</p>}
                  </div>
                  <IconActionButton
                    onClick={() => audioService.speakText(chinese, characterPreference === 'traditional' ? 'zh-TW' : 'zh-CN', 0.84)}
                    variant="surface"
                    size="sm"
                    icon={<AppIcon name="audio" size={17} />}
                    label={`Listen to ${chunk.role.toLowerCase()} section`}
                    className="justify-self-end text-brand-primary sm:justify-self-auto"
                  />
                </article>
              );
            })}
          </div>
        </section>

        <aside className="rounded-[20px] border border-ui-divider bg-ui-surface p-4 lg:sticky lg:top-0" aria-label="Reading aids">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.08em] text-ui-muted">Reading aids</p>
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              <ActionButton variant="quiet" size="sm" aria-pressed={characterPreference === 'traditional'} onClick={() => onCharacterPreferenceChange('traditional')} className={cn(characterPreference === 'traditional' && 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/15 hover:text-brand-primary')}>
                繁體
              </ActionButton>
              <ActionButton variant="quiet" size="sm" aria-pressed={characterPreference === 'simplified'} onClick={() => onCharacterPreferenceChange('simplified')} className={cn(characterPreference === 'simplified' && 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/15 hover:text-brand-primary')}>
                简体
              </ActionButton>
            </div>
            <ActionButton
              variant="quiet"
              size="sm"
              fullWidth
              aria-pressed={showPinyin}
              onClick={onTogglePinyin}
              className={cn('justify-start', showPinyin && 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/15 hover:text-brand-primary')}
            >
              Pinyin {showPinyin ? 'on' : 'off'}
            </ActionButton>
            <ActionButton
              variant="quiet"
              size="sm"
              fullWidth
              aria-pressed={showTranslation}
              onClick={onToggleTranslation}
              className={cn('justify-start', showTranslation && 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/15 hover:text-brand-primary')}
            >
              Meaning {showTranslation ? 'on' : 'off'}
            </ActionButton>
          </div>
          <div className="mt-5 border-t-2 border-ui-divider pt-4">
            <p className="text-xs font-black text-ui-ink">Printed pages 46–49</p>
            <p className="mt-1 text-xs font-bold leading-relaxed text-ui-muted">Audio {part.audioReference} · Read for the shape first; you do not need to memorize every word.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
