import type { InteractiveReadingPart } from '../../../types/models';

interface ReadingStructurePageProps {
  part: InteractiveReadingPart;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
}

export function ReadingStructurePage({ part, characterPreference, showPinyin, showTranslation }: ReadingStructurePageProps) {
  return (
    <section className="mx-auto w-full max-w-4xl" aria-labelledby="structure-title">
      <p className="text-xs font-black uppercase tracking-[0.08em] text-brand-primary">Notice the structure</p>
      <h2 id="structure-title" className="mt-1 text-[28px] font-black leading-tight text-ui-ink-strong sm:text-[36px]">Five small moves, one natural introduction</h2>
      <p className="mt-3 max-w-2xl text-sm font-bold leading-relaxed text-ui-muted sm:text-base">
        Youmei does not say everything in one giant sentence. Each line answers one quiet question from the listener.
      </p>

      <div className="relative mt-8 space-y-3 before:absolute before:bottom-8 before:left-[23px] before:top-8 before:w-1 before:rounded-full before:bg-ui-divider sm:before:left-[27px]">
        {part.chunks.map((chunk, index) => (
          <article key={chunk.id} className="relative grid grid-cols-[48px_minmax(0,1fr)] gap-3 sm:grid-cols-[56px_130px_minmax(0,1fr)] sm:gap-4">
            <span className="z-10 flex h-12 w-12 items-center justify-center rounded-[16px] bg-brand-primary text-base font-black text-white sm:h-14 sm:w-14">
              {index + 1}
            </span>
            <div className="hidden pt-3 sm:block">
              <p className="text-[10px] font-black uppercase tracking-[0.08em] text-ui-muted">Listener wonders</p>
              <p className="mt-1 text-sm font-black text-ui-ink">{['Who is this?', 'What is your name?', 'What connects us?', 'What do you enjoy?', 'Are you finished?'][index]}</p>
            </div>
            <div className="rounded-[18px] border border-ui-divider bg-ui-surface px-4 py-3.5">
              <p className="text-[10px] font-black uppercase tracking-[0.08em] text-brand-primary">{chunk.role}</p>
              <p className="mt-1 font-chinese text-[20px] font-bold leading-relaxed text-ui-ink-strong">
                {characterPreference === 'simplified' ? chunk.simplified : chunk.traditional}
              </p>
              {showPinyin && <p className="mt-0.5 text-sm font-extrabold text-brand-primary">{chunk.pinyin}</p>}
              {showTranslation && <p className="mt-1 text-sm font-bold text-ui-muted">{chunk.english}</p>}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-7 rounded-[18px] border border-feedback-warning/45 bg-[#FFF3C4] px-5 py-4">
        <p className="text-sm font-black text-[#8A5A00]">Useful pattern from page 49</p>
        <p className="mt-1 font-chinese text-xl font-bold text-ui-ink-strong">我喜歡／愛 + 吃／喝 + 東西</p>
        <p className="mt-1 text-sm font-bold text-ui-muted">喜歡 and 愛 can lead into another action: 我喜歡喝茶。／我愛吃水果。</p>
      </div>
    </section>
  );
}
