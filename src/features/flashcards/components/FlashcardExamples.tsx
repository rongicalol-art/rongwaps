import { memo, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AppIcon, Skeleton, SmartSentence, LevelTag } from '../../../lib/widgets';
import { SAMPLE_BOOKS } from '../../../data/books';
import {
  groupRankedExamples,
  type RankedExample,
} from '../../../utils/courseExamples';
import { numberToToneMarks } from '../../../utils/pinyin';
import { useAppStore } from '../../../store/useAppStore';
import { cn } from '../../../utils/cn';

const INITIAL_VISIBLE_COUNT = 3;

interface FlashcardExamplesProps {
  /** Every search form (both scripts, fully expanded, longest-first). */
  searchTerms: string[];
  examples: RankedExample[];
  isLoading: boolean;
  showPinyin: boolean;
  showTranslation: boolean;
}

interface FlashcardExampleRowProps {
  example: RankedExample;
  highlightTerms: string[];
  showPinyin: boolean;
  showTranslation: boolean;
  /** Book/location meta line; hidden inside the compact top-match frame. */
  showMeta?: boolean;
  /** Marks the exact-match sentence with a small star on the right. */
  isTopPick?: boolean;
  /** Bottom divider for list rows; top-match rows inside the card stay clean. */
  divider?: boolean;
  className?: string;
}

const FlashcardExampleRow = memo(function FlashcardExampleRow({
  example,
  highlightTerms,
  showPinyin,
  showTranslation,
  showMeta = true,
  isTopPick = false,
  divider = false,
  className = '',
}: FlashcardExampleRowProps) {
  return (
    <li
      className={`flex min-w-0 flex-col gap-1.5 sm:gap-2 [content-visibility:auto] [contain-intrinsic-size:0_110px] ${
        divider ? 'border-b-2 border-ui-divider' : ''
      } ${className}`}
    >
      <div className="w-full flow-root">
        {showMeta && (
          <span
            className="float-right ml-3 mb-1 inline-flex items-center gap-1 pt-1 select-none"
            title={`Book ${example.sourceBookId}, Lesson ${example.sourceLessonId}${isTopPick ? ' · Top match' : ''}`}
          >
            {isTopPick && (
              <span role="img" aria-label="Top match" className="shrink-0 text-brand-primary">
                <AppIcon name="star" size={11} />
              </span>
            )}
            <LevelTag bookId={example.sourceBookId} lessonId={example.sourceLessonId} />
          </span>
        )}
        <SmartSentence
          text={example.chinese}
          highlightTerms={highlightTerms}
          className="font-chinese text-[18px] sm:text-[20px] md:text-[22px] font-bold leading-relaxed text-ui-ink-strong"
        />
      </div>
      {showPinyin && example.pinyin && (
        <p className="text-sm sm:text-[15px] font-semibold tracking-wide leading-snug text-ui-muted-strong">
          {numberToToneMarks(example.pinyin)}
        </p>
      )}
      {showTranslation && example.english && (
        <p className="ui-translation text-sm sm:text-[15px]">
          {example.english}
        </p>
      )}
    </li>
  );
});

function FlashcardExamplesLoading() {
  return (
    <div className="mt-4 flex w-full flex-col px-6 pb-4 sm:px-8" role="status" aria-label="Loading example sentences">
      {[0, 1].map((index) => (
        <div key={index} className="flex flex-col gap-2 border-b-2 border-ui-divider py-4 last:border-b-0">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-6 w-3/5 rounded-xs" />
            <Skeleton className="h-3.5 w-10 rounded-xs" />
          </div>
          <Skeleton className="h-4 w-1/3 rounded-xs" />
          <Skeleton className="h-4 w-1/2 rounded-xs" />
        </div>
      ))}
    </div>
  );
}

/**
 * The flashcard back's example stream. Clean, frameless rows matching character
 * breakdowns with quiet B# · L# metadata, grouped by book (order itself carries
 * the ranking).
 *
 * For performance, only a curated initial budget (up to 3 sentences) is mounted
 * initially. An expandable toggle allows revealing the full set on demand without
 * bogging down the initial card flip animation.
 */
export const FlashcardExamples = memo(function FlashcardExamples({
  searchTerms,
  examples,
  isLoading,
  showPinyin,
  showTranslation,
}: FlashcardExamplesProps) {
  const reduceMotion = useReducedMotion();
  const hideExamplePinyin = useAppStore((state) => state.hideExamplePinyin);
  const showExamplePinyin = showPinyin && !hideExamplePinyin;
  const [isExpanded, setIsExpanded] = useState(false);

  // Collapse back to initial budget when switching to a different card's examples
  useEffect(() => {
    setIsExpanded(false);
  }, [examples]);

  const { topMatch, bookBlocks } = useMemo(() => {
    const groups = groupRankedExamples(examples);
    const top = groups.find((group) => group.id === 'current-match')?.examples ?? [];
    const byBook = new Map<number, RankedExample[]>();
    for (const group of groups) {
      if (group.id === 'current-match') continue;
      for (const example of group.examples) {
        const list = byBook.get(example.sourceBookId);
        if (list) list.push(example);
        else byBook.set(example.sourceBookId, [example]);
      }
    }
    return {
      topMatch: top,
      bookBlocks: [...byBook.entries()].sort((a, b) => a[0] - b[0]),
    };
  }, [examples]);

  const { visibleTopMatch, visibleBookBlocks, totalRows, hasHidden } = useMemo(() => {
    const total = topMatch.length + bookBlocks.reduce((sum, [, list]) => sum + list.length, 0);
    if (isExpanded || total <= INITIAL_VISIBLE_COUNT) {
      return {
        visibleTopMatch: topMatch,
        visibleBookBlocks: bookBlocks,
        totalRows: total,
        hasHidden: total > INITIAL_VISIBLE_COUNT,
      };
    }

    let remainingBudget = INITIAL_VISIBLE_COUNT;
    const slicedTop = topMatch.slice(0, remainingBudget);
    remainingBudget -= slicedTop.length;

    const slicedBlocks: Array<[number, RankedExample[]]> = [];
    if (remainingBudget > 0) {
      for (const [bookId, list] of bookBlocks) {
        if (remainingBudget <= 0) break;
        const take = list.slice(0, remainingBudget);
        if (take.length > 0) {
          slicedBlocks.push([bookId, take]);
          remainingBudget -= take.length;
        }
      }
    }

    return {
      visibleTopMatch: slicedTop,
      visibleBookBlocks: slicedBlocks,
      totalRows: total,
      hasHidden: true,
    };
  }, [bookBlocks, isExpanded, topMatch]);

  if (isLoading) return <FlashcardExamplesLoading />;
  if (topMatch.length === 0 && bookBlocks.length === 0) return null;

  const EASE = [0.32, 0.72, 0, 1] as const;

  const blockEntrance = (index: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: reduceMotion
      ? { duration: 0 }
      : { duration: 0.24, delay: index * 0.045, ease: EASE },
  });

  const currentTotal = visibleTopMatch.length + visibleBookBlocks.reduce((sum, [, list]) => sum + list.length, 0);
  let rowIndex = 0;

  return (
    <div className="mt-4 flex w-full flex-col pb-4" aria-label="Example sentences">
      {visibleTopMatch.length > 0 && (
        <motion.section {...blockEntrance(0)} aria-label="Top match" className="w-full">
          <ul className="flex w-full flex-col">
            {visibleTopMatch.map((example, index) => {
              const divider = rowIndex < currentTotal - 1;
              rowIndex += 1;
              return (
                <FlashcardExampleRow
                  key={`top-${example.sourceCardId}-${example.chinese}-${index}`}
                  example={example}
                  highlightTerms={searchTerms}
                  showPinyin={showExamplePinyin}
                  showTranslation={showTranslation}
                  isTopPick
                  divider={divider}
                  className="px-6 py-4 sm:px-8 sm:py-4.5"
                />
              );
            })}
          </ul>
        </motion.section>
      )}

      {visibleBookBlocks.map(([bookId, blockExamples], blockIndex) => {
        const book = SAMPLE_BOOKS.find((b) => b.id === bookId);
        return (
          <motion.section
            {...blockEntrance(blockIndex + 1)}
            key={bookId}
            aria-label={book?.label ?? `Book ${bookId}`}
            className="w-full overflow-hidden"
          >
            <ul className="flex w-full flex-col">
              {blockExamples.map((example, index) => {
                const divider = rowIndex < currentTotal - 1;
                rowIndex += 1;
                return (
                  <FlashcardExampleRow
                    key={`${example.sourceCardId}-${example.chinese}-${index}`}
                    example={example}
                    highlightTerms={searchTerms}
                    showPinyin={showExamplePinyin}
                    showTranslation={showTranslation}
                    divider={divider}
                    className="px-6 py-4 sm:px-8 sm:py-4.5"
                  />
                );
              })}
            </ul>
          </motion.section>
        );
      })}

      {hasHidden && (
        <div className="mt-3 flex w-full justify-center px-6 sm:px-8">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            className="group flex min-h-9 items-center justify-center gap-1.5 rounded-compact px-3.5 py-1.5 text-xs font-extrabold text-brand-primary transition-colors hover:bg-brand-primary/10 focus-ring"
          >
            <span>{isExpanded ? 'Show fewer' : `Show all ${totalRows} examples`}</span>
            <AppIcon
              name="expand"
              size={14}
              className={cn('transition-transform duration-200', isExpanded && 'rotate-180')}
            />
          </button>
        </div>
      )}
    </div>
  );
});
