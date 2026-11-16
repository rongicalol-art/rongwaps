import { useState } from 'react';
import { Link } from 'react-router';
import { GUIDE_ROUTES } from '../../../app/routes';
import { PracticeChoiceButton } from '../../../features/practice';
import { LOCKED_BOOK_LESSON_TITLES, SAMPLE_LESSONS } from '../../../data/books';
import { cn } from '../../../utils/cn';
import { MAGNET_STYLE, useMagnet } from '../useMagnet';

/** First reading scene of each lesson at shelf size (16:9, uncropped). */
const ART = import.meta.glob<string>('../../../assets/images/landing/shelf/*.webp', { eager: true, query: '?url', import: 'default' });
const art = (book: number, lesson: number) => ART[`../../../assets/images/landing/shelf/b${book}l${String(lesson).padStart(2, '0')}.webp`];

/** Each tab and tile in its own book's colour, whatever book the page is themed with. */
const BOOK_TONE: Record<number, { tab: string; edge: string; tile: string }> = {
  1: { tab: 'border-book-1 bg-book-1-soft text-ui-ink-strong', edge: 'var(--color-book-1-edge)', tile: 'bg-book-1-soft text-book-1' },
  2: { tab: 'border-book-2 bg-book-2-soft text-ui-ink-strong', edge: 'var(--color-book-2-edge)', tile: 'bg-book-2-soft text-book-2' },
  3: { tab: 'border-book-3 bg-book-3-soft text-ui-ink-strong', edge: 'var(--color-book-3-edge)', tile: 'bg-book-3-soft text-book-3' },
  4: { tab: 'border-book-4 bg-book-4-soft text-ui-ink-strong', edge: 'var(--color-book-4-edge)', tile: 'bg-book-4-soft text-book-4' },
};

/** Book 1 titles are "English · 中文"; later books have English only. */
function lessonsOf(book: number): { en: string; zh?: string }[] {
  if (book === 1) return SAMPLE_LESSONS.map(({ title }) => { const [en, zh] = title.split(' · '); return { en, zh }; });
  return (LOCKED_BOOK_LESSON_TITLES[book] ?? []).map((en) => ({ en }));
}

const BOOK_IDS = [1, 2, 3, 4] as const;

/** Book tabs over a sideways shelf of lesson art; every title stays in the page for search. */
export function LessonShelf() {
  const [book, setBook] = useState(2);
  const magnet = useMagnet();
  return (
    <div>
      <div role="tablist" aria-label="Books" className="mt-6 flex justify-center gap-1.5 lg:gap-2">
        {BOOK_IDS.map((id) => (
          <PracticeChoiceButton
            key={id}
            id={`book-tab-${id}`}
            compact
            role="tab"
            aria-selected={id === book}
            aria-controls={`book-panel-${id}`}
            state={id === book ? 'selected' : 'idle'}
            idleClassName="max-sm:!px-2"
            selectedClassName={`${BOOK_TONE[id].tab} max-sm:!px-2`}
            selectedEdgeColor={BOOK_TONE[id].edge}
            onClick={() => setBook(id)}
            className="w-auto"
          >
            <span className="whitespace-nowrap font-black max-sm:text-base lg:px-1">Book {id}</span>
          </PracticeChoiceButton>
        ))}
      </div>
      {BOOK_IDS.map((id) => {
        const active = id === book;
        return (
          <div
            key={id}
            id={`book-panel-${id}`}
            role="tabpanel"
            aria-labelledby={`book-tab-${id}`}
            aria-label={`Book ${id} lessons`}
            hidden={!active}
            className={cn(
              '-mx-5 mt-3 snap-x overflow-x-auto px-5 py-3 [mask-image:linear-gradient(to_right,transparent,black_28px,black_calc(100%-28px),transparent)] [scrollbar-width:none] lg:-mx-26 lg:gap-4 lg:px-26 lg:[mask-image:linear-gradient(to_right,transparent,black_80px,black_calc(100%-80px),transparent)]',
              !active && 'hidden',
            )}
          >
            <ul className="flex w-max gap-3 lg:gap-4">
              {lessonsOf(id).map(({ en, zh }, i) => {
                const src = art(id, i + 1);
                return (
                  <li key={`${id}-${i}`} {...magnet} className="w-60 shrink-0 snap-start [perspective:800px] lg:w-80">
                    <span style={MAGNET_STYLE} className="flex flex-col gap-1.5 transition-transform duration-200 ease-out motion-reduce:transition-none">
                      <span className={cn('mb-1 flex aspect-video items-center justify-center overflow-hidden rounded-feature', BOOK_TONE[id].tile)}>
                        {src ? <img src={src} alt="" loading="lazy" decoding="async" className="size-full object-cover" /> : <span className="text-5xl font-black">{i + 1}</span>}
                      </span>
                      <span className="ui-eyebrow text-ui-muted-strong">Lesson {i + 1}</span>
                      <span className="font-black leading-tight text-ui-ink-strong">{en}</span>
                      {zh && <span className="font-chinese text-sm font-semibold text-ui-muted-strong">{zh}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <p className="mt-4 text-center">
        <Link to={GUIDE_ROUTES.books} className="rounded-xs text-sm font-extrabold text-brand-primary-text hover:underline focus-ring-inline">
          See all books and lesson topics →
        </Link>
      </p>
    </div>
  );
}
