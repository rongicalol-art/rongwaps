import { useEffect, useState } from 'react';
import { Skeleton, SmartSentence, LevelTag } from '../../../../lib/widgets';
import { numberToToneMarks } from '../../../../utils/pinyin/pinyin';
import { useAppStore } from '../../../../store/useAppStore';
import { ShowMoreButton } from './ShowMoreButton';
import type { WordExample } from '../../../../types/models';

const INITIAL_VISIBLE = 4;

/**
 * Example-sentence block for the V3 breakdown summary. Sits directly below the
 * memory hook; shows the highest-ranked sentences first and expands inline
 * through a Show more toggle when the course corpus has deeper coverage.
 */
export function V3ExampleSentences({ character, sentences, isLoading }: { character: string; sentences: WordExample[]; isLoading: boolean }) {
  const hideExamplePinyin = useAppStore((state) => state.hideExamplePinyin);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [character]);

  if (!isLoading && sentences.length === 0) return null;

  const visible = expanded ? sentences : sentences.slice(0, INITIAL_VISIBLE);
  const canCollapse = expanded && sentences.length > INITIAL_VISIBLE;

  return (
    <section aria-label="Example sentences" className="min-w-0">
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
                className={`flex flex-col gap-1 border-ui-divider py-4 first:pt-1 last:pb-0 ${index < visible.length - 1 ? 'border-b-2' : ''}`}
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
            <ShowMoreButton label="Show more" expanded={false} onClick={() => setExpanded(true)} />
          )}
          {canCollapse && (
            <ShowMoreButton label="Show less" expanded onClick={() => setExpanded(false)} />
          )}
        </>
      )}
    </section>
  );
}
