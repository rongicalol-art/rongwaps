import { useEffect, useState } from 'react';
import { SectionEyebrow, Skeleton, SmartSentence } from '../../../../lib/widgets';
import { numberToToneMarks } from '../../../../utils/pinyin';
import { useCharExampleSentences } from '../../hooks/useCharExampleSentences';

const INITIAL_VISIBLE = 4;

const EXPAND_BUTTON =
  'mt-2 flex min-h-9 w-full items-center justify-center gap-1.5 rounded-compact px-2.5 text-xs font-extrabold text-brand-primary outline-none transition-colors hover:bg-brand-primary/10 focus-visible:ring-4 focus-visible:ring-brand-primary/25';

/**
 * Example-sentence block for the V3 breakdown summary. Sits directly below the
 * memory hook; shows the highest-ranked sentences first and expands inline
 * through a Show more toggle when the course corpus has deeper coverage.
 */
export function V3ExampleSentences({ character }: { character: string }) {
  const { sentences, isLoading } = useCharExampleSentences(character);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [character]);

  if (!isLoading && sentences.length === 0) return null;

  const visible = expanded ? sentences : sentences.slice(0, INITIAL_VISIBLE);
  const canCollapse = expanded && sentences.length > INITIAL_VISIBLE;

  return (
    <section aria-label="Example sentences" className="min-w-0 rounded-feature bg-ui-surface p-4 shadow-[0_3px_0_var(--color-ui-divider)] sm:p-6">
      <SectionEyebrow title="Example sentences" />
      {isLoading ? (
        <div className="mt-1 flex flex-col gap-3" role="status" aria-label="Loading example sentences">
          {[0, 1, 2].map((index) => (
            <div key={index}>
              <Skeleton className="h-4 w-3/4 rounded-[4px]" />
              <Skeleton className="mt-1.5 h-3 w-1/2 rounded-[4px]" />
              <Skeleton className="mt-1 h-3 w-2/5 rounded-[4px]" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <ul className="mt-1">
            {visible.map((sentence, index) => (
              <li
                key={`${sentence.chinese}-${index}`}
                className={`flex flex-col gap-1 border-ui-divider py-3 first:pt-0 last:pb-0 ${index < visible.length - 1 ? 'border-b' : ''}`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <SmartSentence
                    text={sentence.chinese}
                    highlightTerms={[character]}
                    className="font-chinese text-base font-bold leading-snug text-ui-ink sm:text-[17px]"
                  />
                  <span className="shrink-0 text-[9px] font-extrabold text-ui-muted">
                    B{sentence.sourceBookId} · L{sentence.sourceLessonId}
                  </span>
                </div>
                <span className="text-xs font-extrabold leading-tight text-brand-primary">
                  {numberToToneMarks(sentence.pinyin)}
                </span>
                <span className="text-xs font-semibold leading-snug text-ui-muted">{sentence.english}</span>
              </li>
            ))}
          </ul>
          {!expanded && sentences.length > INITIAL_VISIBLE && (
            <button type="button" onClick={() => setExpanded(true)} className={EXPAND_BUTTON}>
              Show more
            </button>
          )}
          {canCollapse && (
            <button type="button" onClick={() => setExpanded(false)} className={EXPAND_BUTTON}>
              Show less
            </button>
          )}
        </>
      )}
    </section>
  );
}
