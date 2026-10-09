import { useMemo, useState } from 'react';
import { Skeleton } from '../../../lib/widgets';
import { numberToToneMarks } from '../../../utils/pinyin/pinyin';
import { useLevels } from '../../../hooks/useLevels';
import { levelRank } from '../../../utils/vocabulary/wordOrdering';
import { BreakdownRow, ShowMoreButton } from '../../character-breakdown';
import type { WordRelatedWord } from '../hooks/useWordExtras';
import { CourseOrLevelTag } from './CourseOrLevelTag';

const DEFAULT_VISIBLE = 8;

/** Words that share characters with this one, easiest first, as flat list rows. */
export function WordRelatedList({ word, relatedWords, isLoading, onOpenWord }: {
  word: string;
  relatedWords: WordRelatedWord[];
  isLoading: boolean;
  onOpenWord: (word: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const levels = useLevels();
  const ordered = useMemo(
    () => relatedWords
      .map((item, index) => ({ item, index, level: levelRank(item.word, levels) }))
      .sort((a, b) => a.level - b.level || a.index - b.index)
      .map(({ item }) => item),
    [relatedWords, levels],
  );
  const visible = showAll ? ordered : ordered.slice(0, DEFAULT_VISIBLE);

  if (isLoading) {
    return (
      <div className="flex flex-col" role="status" aria-label="Loading related words">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 border-b-2 border-ui-divider px-1 py-3 last:border-b-0">
            <Skeleton className="h-8 w-[4.5rem] shrink-0" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-4 w-40 max-w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col">
      {visible.map((item) => (
        <BreakdownRow
          key={item.word}
          glyph={item.word}
          highlight={word}
          pinyin={item.pinyin ? numberToToneMarks(item.pinyin) : undefined}
          meaning={item.definition}
          trailing={<CourseOrLevelTag text={item.word} />}
          onClick={() => onOpenWord(item.word)}
          ariaLabel={`Open breakdown for ${item.word}`}
        />
      ))}
      {ordered.length > DEFAULT_VISIBLE && (
        <ShowMoreButton
          label={showAll ? 'Show less' : `See all ${ordered.length}`}
          expanded={showAll}
          onClick={() => setShowAll((value) => !value)}
        />
      )}
    </div>
  );
}
