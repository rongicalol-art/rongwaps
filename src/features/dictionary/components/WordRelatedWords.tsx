import { SectionEyebrow, Skeleton } from '../../../lib/widgets';
import { numberToToneMarks } from '../../../utils/pinyin';
import type { WordRelatedWord } from '../hooks/useWordExtras';

const CHIP =
  'group flex min-h-[64px] min-w-0 items-center gap-3 rounded-compact bg-ui-surface px-3.5 py-2.5 text-left shadow-[0_2px_0_var(--color-ui-divider)] outline-none transition-[background-color,transform,box-shadow] hover:bg-ui-surface-hover active:translate-y-px active:shadow-[0_1px_0_var(--color-ui-divider)] focus-visible:ring-4 focus-visible:ring-brand-primary/25';

export function WordRelatedWords({
  relatedWords,
  isLoading,
  onOpenWord,
}: {
  relatedWords: WordRelatedWord[];
  isLoading: boolean;
  onOpenWord: (word: string) => void;
}) {
  if (!isLoading && relatedWords.length === 0) return null;

  return (
    <section aria-labelledby="word-related-heading" className="flex w-full flex-col gap-3">
      <SectionEyebrow
        id="word-related-heading"
        title="Related Words"
        count={isLoading ? undefined : relatedWords.length}
      />
      {isLoading ? (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="flex min-h-[64px] items-center gap-3 rounded-compact bg-ui-surface px-3.5 py-2.5">
              <Skeleton className="h-7 w-12 rounded-[6px]" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {relatedWords.map((item) => (
            <button
              key={item.word}
              type="button"
              onClick={() => onOpenWord(item.word)}
              className={CHIP}
            >
              <span className="shrink-0 font-chinese text-[22px] font-bold leading-none text-ui-ink-strong">
                {item.word}
              </span>
              <span className="flex min-w-0 flex-1 flex-col text-left">
                <span className="truncate text-[11px] font-extrabold leading-tight text-brand-primary">
                  {item.pinyin ? numberToToneMarks(item.pinyin) : '\u00A0'}
                </span>
                <span className="line-clamp-2 text-[11px] font-bold leading-snug text-ui-muted">
                  {item.definition}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
