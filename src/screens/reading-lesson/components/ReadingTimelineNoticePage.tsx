import { ContextualChineseText } from '../../../lib/widgets';
import type { InteractiveReadingPart } from '../../../types/models';

interface ReadingTimelineNoticePageProps {
  part: InteractiveReadingPart;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  onOpenWord: (word: string) => void;
}

export function ReadingTimelineNoticePage({
  part,
  characterPreference,
  showPinyin,
  showTranslation,
  onOpenWord,
}: ReadingTimelineNoticePageProps) {
  return (
    <section className="mx-auto w-full max-w-4xl" aria-labelledby="timeline-notice-title">
      <p className="text-xs font-black uppercase tracking-[0.08em] text-brand-primary">Notice the sentence rhythm</p>
      <h2 id="timeline-notice-title" className="mt-1 text-[28px] font-black leading-tight text-ui-ink-strong sm:text-[36px]">
        Time first. Action second.
      </h2>
      <p className="mt-3 max-w-2xl text-sm font-bold leading-relaxed text-ui-muted sm:text-base">
        Chinese places the time before the action. Youmei’s schedule repeats that rhythm eight times, so the long reading becomes predictable.
      </p>

      <div className="mt-7 rounded-[20px] border border-brand-primary/30 bg-[#EAF7FF] px-5 py-4">
        <p className="text-xs font-black uppercase tracking-[0.08em] text-brand-primary">Sentence frame</p>
        <p className="mt-2 font-chinese text-xl font-black text-ui-ink-strong sm:text-2xl">
          <ContextualChineseText
            text={characterPreference === 'simplified' ? '她 + 时间 + 动作' : '她 + 時間 + 動作'}
            tokens={part.teachingGlossary}
            focusTerms={characterPreference === 'simplified' ? ['时间'] : ['時間']}
            characterPreference={characterPreference}
            onOpenWord={onOpenWord}
          />
        </p>
        <p className="mt-1 text-sm font-bold text-ui-muted">She + when + what she does</p>
      </div>

      <div className="relative mt-7 space-y-3 before:absolute before:bottom-7 before:left-[27px] before:top-7 before:w-1 before:rounded-full before:bg-ui-divider">
        {(part.timeline ?? []).map((item) => {
          const chinese = characterPreference === 'simplified' ? item.simplified : item.traditional;
          return (
            <article key={item.id} className="relative grid grid-cols-[56px_minmax(0,1fr)] gap-3 sm:gap-5">
              <span className="z-10 flex h-14 w-14 items-center justify-center rounded-[17px] bg-brand-primary text-xs font-black text-white tabular-nums">
                {item.time}
              </span>
              <div className="rounded-[18px] border border-ui-divider bg-ui-surface px-4 py-3">
                <p className="font-chinese text-[20px] font-bold leading-relaxed text-ui-ink-strong">
                  <ContextualChineseText
                    text={chinese}
                    tokens={part.teachingGlossary}
                    characterPreference={characterPreference}
                    onOpenWord={onOpenWord}
                  />
                </p>
                {showPinyin && <p className="text-sm font-extrabold text-brand-primary">{item.pinyin}</p>}
                {showTranslation && <p className="mt-0.5 text-sm font-bold text-ui-muted">{item.english}</p>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
