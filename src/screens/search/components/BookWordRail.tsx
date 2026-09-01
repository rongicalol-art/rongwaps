import { useCallback, useEffect, useState } from 'react';
import type { Flashcard } from '../../../data/flashcards';
import { AppIcon, IconActionButton, PosBadge, Skeleton } from '../../../lib/widgets';
import { useBookVocabulary } from '../hooks/useBookVocabulary';

const ROW_COUNT = 5;

interface BookWordRailProps {
  bookId: number;
  onOpenWord: (word: string) => void;
}

/** Partial Fisher–Yates: returns `count` random unique cards without mutating the source. */
function dealRandomWords(cards: Flashcard[], count: number): Flashcard[] {
  const pool = [...cards];
  const picks = Math.min(count, pool.length);
  for (let i = 0; i < picks; i += 1) {
    const j = i + Math.floor(Math.random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, picks);
}

function WordRow({ card, onOpenWord }: { card: Flashcard; onOpenWord: (word: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpenWord(card.front)}
      aria-label={`Open ${card.front}`}
      className="group flex w-full items-center gap-3 py-3.5 text-left outline-none focus-ring rounded-sm sm:gap-4"
    >
      <span className="shrink-0 font-chinese text-[26px] font-bold leading-none text-ui-ink transition-colors group-hover:text-brand-primary sm:text-[30px]">
        {card.front}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px] font-extrabold text-ui-muted sm:text-[14px]">
            {card.pinyin || '\u00A0'}
          </span>
          <PosBadge pos={card.pos} />
        </span>
        <span className="line-clamp-1 text-[14px] font-bold leading-snug text-ui-ink sm:text-[15px]">
          {card.back || '\u00A0'}
        </span>
      </span>
    </button>
  );
}

/**
 * Full-width dictionary-home band listing a rotating handful of real words
 * from the active book. Quiet rows only — tapping a word opens the detail
 * overlay where audio and the breakdown live.
 */
export function BookWordRail({ bookId, onOpenWord }: BookWordRailProps) {
  const { cards, isLoading, error, refetch } = useBookVocabulary(bookId);
  const [deal, setDeal] = useState(0);
  const [shownWords, setShownWords] = useState<Flashcard[]>([]);

  // Re-deal whenever new vocabulary arrives or the learner asks for a fresh set.
  const reshuffle = useCallback(() => setDeal((value) => value + 1), []);

  useEffect(() => {
    setShownWords(dealRandomWords(cards, ROW_COUNT));
  }, [cards, deal]);

  // Nothing useful to show when the book has no vocabulary at all.
  if (!isLoading && !error && cards.length === 0) return null;

  return (
    <section aria-label="From your book" className="rounded-feature border-b-[length:var(--depth-md)] border-ui-divider bg-ui-surface p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-ui-ink-strong">
          <h2 className="text-[16px] font-black">From your book</h2>
          {!isLoading && !error && (
            <span className="truncate text-[12px] font-bold text-ui-muted">
              · {cards.length} {cards.length === 1 ? 'word' : 'words'}
            </span>
          )}
        </div>
        {!isLoading && !error && cards.length > ROW_COUNT && (
          <IconActionButton
            type="button"
            variant="quiet"
            size="md"
            onClick={reshuffle}
            label="Show different words"
            icon={<AppIcon name="shuffle" size={18} />}
          />
        )}
      </div>

      {error ? (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-control bg-ui-canvas px-4 py-8 text-center">
          <AppIcon name="error" size={24} className="text-feedback-danger" />
          <p className="max-w-sm text-[13px] font-bold text-ui-muted">{error}</p>
          <IconActionButton
            type="button"
            variant="quiet"
            size="md"
            onClick={refetch}
            label="Retry loading book words"
            icon={<AppIcon name="restart" size={18} />}
          />
        </div>
      ) : (
        <div className="mt-2 flex flex-col [&>*+*]:border-t [&>*+*]:border-ui-divider">
          {isLoading
            ? Array.from({ length: ROW_COUNT }, (_, index) => (
                <div key={index} className="flex w-full items-center gap-3 py-3.5 sm:gap-4">
                  <Skeleton className="h-8 w-20 shrink-0 sm:w-24" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-4 w-44 max-w-full" />
                  </div>
                </div>
              ))
            : shownWords.map((card) => (
                <WordRow key={card.id} card={card} onOpenWord={onOpenWord} />
              ))}
        </div>
      )}
    </section>
  );
}
