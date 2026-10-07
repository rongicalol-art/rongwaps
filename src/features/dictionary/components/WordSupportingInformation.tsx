import { useState, useMemo } from 'react';
import { ReferenceRow, SectionEyebrow } from '../../../lib/widgets';
import { CourseOrLevelTag } from './CourseOrLevelTag';
import { numberToToneMarks } from '../../../utils/pinyin/pinyin';
import type { SAMPLE_BOOKS } from '../../../data/books';
import type { WordRelatedWord } from '../hooks/useWordExtras';
import { useLevels } from '../../../hooks/useLevels';
import { levelRank } from '../../../utils/vocabulary/wordOrdering';

const SEE_ALL_CLASSES =
  'min-h-9 shrink-0 rounded-compact px-2.5 text-xs font-extrabold text-brand-primary transition-colors hover:bg-brand-primary/10 focus-ring';
const DEFAULT_VISIBLE_RELATED = 5;

type CourseBook = (typeof SAMPLE_BOOKS)[number];

export function hasWordSupportingInfo(
  relatedWords: WordRelatedWord[],
  isRelatedLoading: boolean,
): boolean {
  return isRelatedLoading || relatedWords.length > 0;
}

export function WordSupportingInformation({
  relatedWords,
  isRelatedLoading,
  onOpenWord,
  activeBook,
}: {
  relatedWords: WordRelatedWord[];
  isRelatedLoading: boolean;
  onOpenWord: (word: string) => void;
  activeBook: CourseBook;
}) {
  const [showAllRelated, setShowAllRelated] = useState(false);
  const levels = useLevels();
  // Easiest first; unleveled words keep their order after.
  const orderedRelated = useMemo(
    () => relatedWords
      .map((item, index) => ({ item, index, level: levelRank(item.word, levels) }))
      .sort((a, b) => a.level - b.level || a.index - b.index)
      .map(({ item }) => item),
    [relatedWords, levels],
  );

  const visibleRelated = showAllRelated
    ? orderedRelated
    : orderedRelated.slice(0, DEFAULT_VISIBLE_RELATED);

  if (!hasWordSupportingInfo(relatedWords, isRelatedLoading)) {
    return null;
  }

  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label="Word context">
      {(isRelatedLoading || relatedWords.length > 0) && (
        <div className="min-w-0 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-6">
          <SectionEyebrow
            title="Related Words"
            count={isRelatedLoading ? undefined : relatedWords.length}
            action={
              !isRelatedLoading && relatedWords.length > DEFAULT_VISIBLE_RELATED ? (
                <button
                  type="button"
                  onClick={() => setShowAllRelated((prev) => !prev)}
                  className={SEE_ALL_CLASSES}
                >
                  {showAllRelated ? 'Show fewer' : `See all (${relatedWords.length})`}
                </button>
              ) : undefined
            }
          />
          <div className="mt-1 divide-y-2 divide-ui-divider">
            {isRelatedLoading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <ReferenceRow
                  key={idx}
                  glyph="&nbsp;"
                  loading
                  onClick={() => {}}
                  ariaLabel="Loading related word"
                />
              ))
            ) : (
              visibleRelated.map((item) => (
                <ReferenceRow
                  key={item.word}
                  glyph={item.word}
                  accentClassName={activeBook.accent}
                  primary={item.pinyin ? numberToToneMarks(item.pinyin) : undefined}
                  secondary={item.definition}
                  trailing={<CourseOrLevelTag text={item.word} />}
                  onClick={() => onOpenWord(item.word)}
                  ariaLabel={`Open breakdown for ${item.word}`}
                />
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}
