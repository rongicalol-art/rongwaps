import { tocflLabel, type ResolvedLevel } from '../../utils/lesson/levels';

/** The one badge look: soft grey pill, same as the header chip, in every list. */
const PILL_CLASSES = 'inline-flex shrink-0 whitespace-nowrap items-center rounded-compact bg-ui-hover px-2 py-1 text-xs font-black leading-none tracking-wide text-ui-muted-strong';

/**
 * Where a character or word sits for the learner. The course lesson is the
 * primary signal (the app follows the book); the TOCFL level (TBCL scale,
 * HSK gap fill, or a character-based estimate shown as `~B1`) shows only when
 * there is no lesson, or as a quiet secondary chip.
 *
 * `variant="row"`: trailing meta on reference rows — `Bk1 · L3`, else the short TOCFL label (`N`, `A1` … `C2`) in the same pill.
 * `variant="chip"`: header chip — `TOCFL A2`; estimates spell it out (`TOCFL ~C1 · estimated`)
 * because row tooltips are hover-only.
 */
export function LevelTag({
  bookId,
  lessonId,
  level,
  variant = 'row',
  long = false,
}: {
  bookId?: number;
  lessonId?: number;
  level?: ResolvedLevel | null;
  variant?: 'row' | 'chip';
  /** Spell the lesson out (`Book 1 · Lesson 3`) for headers; rows keep `Bk1 · L3`. */
  long?: boolean;
}) {
  const estimate = level?.source === 'estimate';
  const muted = estimate || level?.source === 'rare';
  const label = level ? `${estimate ? '~' : ''}${tocflLabel(level.level)}` : '';
  if (variant === 'chip') {
    if (!level) return null;
    return (
      <span
        title={titleFor(level)}
        className={PILL_CLASSES}
      >
        {level.source === 'rare' ? 'Rare · beyond TOCFL lists' : <>{label}{estimate && ' · estimated'}</>}
      </span>
    );
  }
  if (bookId !== undefined) {
    return (
      <span title={`Book ${bookId}, Lesson ${lessonId}`} className={PILL_CLASSES}>
        {long ? `Book ${bookId} · Lesson ${lessonId}` : `Bk${bookId} · L${lessonId}`}
      </span>
    );
  }
  if (!level) return null;
  return (
    <span title={titleFor(level)} className={`${PILL_CLASSES} ${muted ? 'opacity-70' : ''}`}>
      {estimate ? '~' : ''}{shortLabel(level.level)}
    </span>
  );
}

/** `N`, `A1` … `C2`; rare words keep the word. */
function shortLabel(level: number): string {
  const label = tocflLabel(level);
  return label === 'Novice' ? 'N' : label;
}

function titleFor({ level, source }: ResolvedLevel): string {
  const label = tocflLabel(level);
  if (source === 'tbcl') return `TOCFL ${label} (TBCL level ${level} of 7) — not in your books`;
  if (source === 'hsk') return `TOCFL ${label} — from the New HSK 2025 list`;
  if (source === 'rare') return 'Rare — outside the TOCFL (TBCL) and New HSK lists';
  return `TOCFL ~${label} — estimated from its characters`;
}
