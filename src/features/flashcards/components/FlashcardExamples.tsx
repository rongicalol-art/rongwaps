import { memo, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AppIcon, Skeleton, SmartSentence, LevelTag } from '../../../lib/widgets';
import { SAMPLE_BOOKS } from '../../../data/books';
import {
  groupRankedExamples,
  type RankedExample,
} from '../../../utils/vocabulary/courseExamples';
import { numberToToneMarks } from '../../../utils/pinyin/pinyin';
import { alignSentenceSyllables } from '../../../utils/pinyin/pinyinTones';
import { cn } from '../../../utils/cn';
import { dialogueTranslation } from '../../../utils/lesson/dialogueTurns';
import { useAppStore } from '../../../store/useAppStore';
import { playSentence } from '../../../services/audio/sentenceAudio';

interface FlashcardExamplesProps {
  /** Every search form (both scripts, fully expanded, longest-first). */
  searchTerms: string[];
  examples: RankedExample[];
  isLoading: boolean;
  showPinyin: boolean;
  showTranslation: boolean;
  /** The card's own top match inside the hero: no source chip, the hero sets the side inset. */
  compact?: boolean;
}

interface FlashcardExampleRowProps {
  example: RankedExample;
  highlightTerms: string[];
  showPinyin: boolean;
  showTranslation: boolean;
  /** Book/location chip; hidden on the card's own top match. */
  showMeta?: boolean;
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
  divider = false,
  className = '',
}: FlashcardExampleRowProps) {
  const characterPreference = useAppStore((state) => state.characterPreference);
  // Pinyin sits above each character when every hanzi pairs with a syllable; otherwise it stays a line below.
  const syllables = useMemo(
    () => (showPinyin ? alignSentenceSyllables(example.chinese, example.pinyin) : null),
    [showPinyin, example.chinese, example.pinyin],
  );
  return (
    <li
      className={`flex min-w-0 flex-col gap-1 [content-visibility:auto] [contain-intrinsic-size:0_110px] ${
        divider ? 'border-b-2 border-ui-divider' : ''
      } ${className}`}
    >
      <div className="w-full flow-root">
        {/* The negative bottom margin keeps the 32px button from making a one-line sentence taller than its text. */}
        <span className="float-right -mb-2 ml-3 inline-flex items-center gap-1">
          {showMeta && (
            <span
              className="inline-flex items-center select-none"
              title={`Book ${example.sourceBookId}, Lesson ${example.sourceLessonId}`}
            >
              <LevelTag bookId={example.sourceBookId} lessonId={example.sourceLessonId} />
            </span>
          )}
          <button
            type="button"
            aria-label={`Play the example sentence ${example.chinese}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              void playSentence(example.chinese, example.audio, characterPreference).catch(() => {});
            }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-compact text-ui-muted transition-colors hover:bg-ui-hover hover:text-brand-primary focus-ring"
          >
            <AppIcon name="audio" size={16} />
          </button>
        </span>
        <SmartSentence
          text={example.chinese}
          highlightTerms={highlightTerms}
          syllables={syllables}
          exampleLayout
          className={cn('font-chinese text-[18px] font-bold text-ui-ink-strong sm:text-[20px] md:text-[22px]', syllables ? 'leading-[1.9]' : 'leading-relaxed')}
        />
      </div>
      {showPinyin && example.pinyin && !syllables && (
        <p className="text-sm font-semibold tracking-wide leading-snug text-ui-muted-strong sm:text-[15px]">
          {numberToToneMarks(example.pinyin)}
        </p>
      )}
      {showTranslation && example.english && (
        <p className="ui-translation -mt-1.5 text-sm leading-snug sm:text-[15px]">
          {dialogueTranslation(example.english)}
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
 * The back face renders the primary sentence in the hero area and the rest
 * below the fold, so everything else is reached by scrolling.
 */
export const FlashcardExamples = memo(function FlashcardExamples({
  searchTerms,
  examples,
  isLoading,
  showPinyin,
  showTranslation,
  compact = false,
}: FlashcardExamplesProps) {
  const reduceMotion = useReducedMotion();
  const hideExamplePinyin = useAppStore((state) => state.hideExamplePinyin);
  const showExamplePinyin = showPinyin && !hideExamplePinyin;
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

  const visibleTopMatch = topMatch;
  const visibleBookBlocks = bookBlocks;

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
    <div className={compact ? 'mt-4 flex w-full flex-col border-t-2 border-ui-divider pt-3 text-left' : 'flex w-full flex-col pb-4'} aria-label="Example sentences">
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
                  divider={divider && !compact}
                  showMeta={!compact}
                  className={compact ? 'pb-1' : 'px-6 py-4 sm:px-8 sm:py-4.5'}
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
                    divider={divider && !compact}
                    showMeta={!compact}
                    className={compact ? 'pb-1' : 'px-6 py-4 sm:px-8 sm:py-4.5'}
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
