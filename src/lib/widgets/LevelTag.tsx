import { tocflLabel, type ResolvedLevel } from '../../utils/lesson/levels';

/** The one badge look: soft grey pill, same as the header chip, in every list. */
const PILL_CLASSES = 'inline-flex shrink-0 whitespace-nowrap items-center rounded-compact bg-ui-hover px-2 py-1 text-xs font-black leading-none tracking-wide text-ui-muted-strong';

/**
 * A level the learner can trust: from the TBCL or New HSK list, or "Rare" (on
 * neither). A guess from the word's characters orders lists but is never shown.
 */
export function shownLevel(level: ResolvedLevel | null | undefined): ResolvedLevel | null {
  return level && level.source !== 'estimate' ? level : null;
}

/** One line on what a level tag means, for its tooltip and for the word page's tap. */
export function levelExplanation({ level, source }: ResolvedLevel): string {
  const label = tocflLabel(level);
  if (source === 'rare') return 'Rare: on neither the TOCFL (TBCL) nor the New HSK word list.';
  if (source === 'hsk') return `${label}: from the New HSK 2025 list, on the same Novice to C2 scale.`;
  return `${label}: level ${level} of 7 on Taiwan's TOCFL word list (TBCL), from Novice to C2.`;
}

/**
 * Where a character or word sits for the learner. The course lesson is the
 * primary signal (the app follows the book); the TOCFL level (TBCL scale or
 * HSK gap fill, one scale: Novice, A1 … C2, Rare) shows only when there is no
 * lesson, or as a quiet secondary chip. Guessed levels are never shown.
 *
 * `variant="row"`: trailing meta on reference rows — `Bk1 · L3`, else the level in the same pill.
 * `variant="chip"`: header chip; with `onClick` it is a button (the word page explains it on tap).
 */
export function LevelTag({
  bookId,
  lessonId,
  level: resolved,
  variant = 'row',
  long = false,
  onClick,
  expanded,
}: {
  bookId?: number;
  lessonId?: number;
  level?: ResolvedLevel | null;
  variant?: 'row' | 'chip';
  /** Spell the lesson out (`Book 1 · Lesson 3`) for headers; rows keep `Bk1 · L3`. */
  long?: boolean;
  /** Chip only: makes the chip a button, e.g. to show `levelExplanation`. */
  onClick?: () => void;
  /** Chip only, with `onClick`: whether the explanation it toggles is showing. */
  expanded?: boolean;
}) {
  const level = shownLevel(resolved);
  if (variant === 'chip') {
    if (!level) return null;
    const label = level.source === 'rare' ? 'Rare · beyond TOCFL lists' : tocflLabel(level.level);
    if (onClick) {
      return (
        <button type="button" onClick={onClick} aria-expanded={expanded} title={levelExplanation(level)} className={`${PILL_CLASSES} transition-colors hover:text-ui-ink-strong focus-ring`}>
          {label}
        </button>
      );
    }
    return <span title={levelExplanation(level)} className={PILL_CLASSES}>{label}</span>;
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
    <span title={levelExplanation(level)} className={`${PILL_CLASSES} ${level.source === 'rare' ? 'opacity-70' : ''}`}>
      {tocflLabel(level.level)}
    </span>
  );
}
