import { useEffect, useState } from 'react';
import { SectionEyebrow, Skeleton, SmartSentence, LevelTag } from '../../../../lib/widgets';
import { numberToToneMarks } from '../../../../utils/pinyin/pinyin';
import { useAppStore } from '../../../../store/useAppStore';
import { useCharExampleSentences } from '../../hooks/useCharExampleSentences';

const INITIAL_VISIBLE = 4;

const EXPAND_BUTTON =
  'mt-2 flex min-h-9 w-full items-center justify-center gap-1.5 rounded-compact px-2.5 text-xs font-extrabold text-brand-primary transition-colors hover:bg-brand-primary/10 focus-ring';

/**
 * Example-sentence block for the V3 breakdown summary. Sits directly below the
 * memory hook; shows the highest-ranked sentences first and expands inline
 * through a Show more toggle when the course corpus has deeper coverage.
 */
export function V3ExampleSentences({ character }: { character: string }) {
  const { sentences, isLoading } = useCharExampleSentences(character);
  const hideExamplePinyin = useAppStore((state) => state.hideExamplePinyin);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [character]);

  if (!isLoading && sentences.length === 0) return null;

  const visible = expanded ? sentences : sentences.slice(0, INITIAL_VISIBLE);
  const canCollapse = expanded && sentences.length > INITIAL_VISIBLE;

  return (
    <section aria-label="Example sentences" className="min-w-0 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-6">
      <SectionEyebrow title="Example sentences" />
      {isLoading ? (
        <div className="mt-1 flex flex-col gap-3" role="status" aria-label="Loading example sentences">
          {[0, 1, 2].map((index) => (
            <div key={index}>
              <Skeleton className="h-4 w-3/4 rounded-xs" />
              <Skeleton className="mt-1.5 h-3 w-1/2 rounded-xs" />
              <Skeleton className="mt-1 h-3 w-2/5 rounded-xs" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <ul className="mt-1">
            {visible.map((sentence, index) => (
              <li
                key={`${sentence.chinese}-${index}`}
                className={`flex flex-col gap-1 border-ui-divider py-3 first:pt-0 last:pb-0 ${index < visible.length - 1 ? 'border-b-2' : ''}`}
              >
                <div className="w-full flow-root">
                  <span className="float-right ml-3 mb-1 pt-1"><LevelTag bookId={sentence.sourceBookId} lessonId={sentence.sourceLessonId} /></span>
                  <SmartSentence
                    text={sentence.chinese}
                    highlightTerms={[character]}
                    className="font-chinese text-xl font-bold leading-snug text-ui-ink sm:text-2xl"
                  />
                </div>
                {!hideExamplePinyin && (
                  <span className="text-[13px] font-extrabold leading-tight text-brand-primary sm:text-sm">
                    {numberToToneMarks(sentence.pinyin)}
                  </span>
                )}
                <span className="ui-translation text-sm leading-snug sm:text-base">{sentence.english}</span>
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
