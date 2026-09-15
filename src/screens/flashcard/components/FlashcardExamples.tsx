import { memo, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AppIcon, Skeleton, SmartSentence } from '../../../lib/widgets';
import { SAMPLE_BOOKS } from '../../../data/books';
import {
  groupRankedExamples,
  type RankedExample,
} from '../../../utils/courseExamples';
import { numberToToneMarks } from '../../../utils/pinyin';

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
  const book = SAMPLE_BOOKS.find((b) => b.id === example.sourceBookId);

  return (
    <li
      className={`flex min-w-0 flex-col gap-1.5 sm:gap-2 [content-visibility:auto] [contain-intrinsic-size:0_110px] ${
        divider ? 'border-b border-ui-divider' : ''
      } ${className}`}
    >
      <div className="flex w-full items-baseline justify-between gap-3">
        <SmartSentence
          text={example.chinese}
          highlightTerms={highlightTerms}
          className="min-w-0 flex-1 font-chinese text-[18px] sm:text-[20px] md:text-[22px] font-bold leading-relaxed text-ui-ink-strong"
        />
        {showMeta && (
          <span
            className="shrink-0 inline-flex items-center gap-1.5 rounded-compact bg-ui-hover px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-ui-muted"
            title={`Book ${example.sourceBookId}, Lesson ${example.sourceLessonId}${isTopPick ? ' · Top match' : ''}`}
          >
            {isTopPick && (
              <span
                role="img"
                aria-label="Top match"
                className={`shrink-0 ${book?.accent ?? 'text-brand-primary'}`}
              >
                <AppIcon name="star" size={12} />
              </span>
            )}
            <span>B{example.sourceBookId} · L{example.sourceLessonId}</span>
            <span className={`h-1.5 w-1.5 rounded-full ${book?.accentBg ?? 'bg-brand-primary'}`} />
          </span>
        )}
      </div>
      {showPinyin && example.pinyin && (
        <p className="text-sm sm:text-[15px] font-semibold tracking-wide leading-snug text-ui-muted-strong">
          {numberToToneMarks(example.pinyin)}
        </p>
      )}
      {showTranslation && example.english && (
        <p className="text-sm sm:text-[15px] font-medium leading-relaxed text-ui-muted-strong/90">
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
        <div key={index} className="flex flex-col gap-2 border-b border-ui-divider py-4 last:border-b-0">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-6 w-3/5 rounded-xs" />
            <Skeleton className="h-4.5 w-14 rounded-compact" />
          </div>
          <Skeleton className="h-4 w-1/3 rounded-xs" />
          <Skeleton className="h-4 w-1/2 rounded-xs" />
        </div>
      ))}
    </div>
  );
}

/**
 * The flashcard back's example stream. The exact match leads as a plain row
 * marked with a small star in the source book's accent on the left — no
 * frame, no label text. Everything else flows as quiet per-book blocks:
 * plain rows with only a bottom divider, grouped by book (order itself
 * carries the ranking). Only blocks animate, so a deep result set still
 * mounts all sentences without one animation per row.
 */
export const FlashcardExamples = memo(function FlashcardExamples({
  searchTerms,
  examples,
  isLoading,
  showPinyin,
  showTranslation,
}: FlashcardExamplesProps) {
  const reduceMotion = useReducedMotion();

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

  // One continuous stream: dividers run across every row except the last, so
  // the per-book grouping and the top match stay visually seamless.
  const totalRows = topMatch.length + bookBlocks.reduce((sum, [, list]) => sum + list.length, 0);
  let rowIndex = 0;

  return (
    <div className="mt-4 flex w-full flex-col pb-4" aria-label="Example sentences">
      {topMatch.length > 0 && (
        <motion.section {...blockEntrance(0)} aria-label="Top match" className="w-full">
          <ul className="flex w-full flex-col">
            {topMatch.map((example, index) => {
              const divider = rowIndex < totalRows - 1;
              rowIndex += 1;
              return (
                <FlashcardExampleRow
                  key={`top-${example.sourceCardId}-${example.chinese}-${index}`}
                  example={example}
                  highlightTerms={searchTerms}
                  showPinyin={showPinyin}
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

      {bookBlocks.map(([bookId, blockExamples], blockIndex) => {
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
                const divider = rowIndex < totalRows - 1;
                rowIndex += 1;
                return (
                  <FlashcardExampleRow
                    key={`${example.sourceCardId}-${example.chinese}-${index}`}
                    example={example}
                    highlightTerms={searchTerms}
                    showPinyin={showPinyin}
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
    </div>
  );
});
