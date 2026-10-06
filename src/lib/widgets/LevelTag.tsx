import { tocflLabel, type ResolvedLevel } from '../../utils/levels';

/** The one badge look: soft grey pill, same as the header chip, in every list. */
const PILL_CLASSES = 'inline-flex shrink-0 whitespace-nowrap items-center rounded-xs bg-ui-hover px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-ui-muted';

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
}: {
  bookId?: number;
  lessonId?: number;
  level?: ResolvedLevel | null;
  variant?: 'row' | 'chip';
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
        {level.source === 'rare' ? 'Rare · beyond TOCFL lists' : <>TOCFL {label}{estimate && <span className="normal-case"> · estimated</span>}</>}
      </span>
    );
  }
  if (bookId !== undefined) {
    return (
      <span title={`Book ${bookId}, Lesson ${lessonId}`} className={PILL_CLASSES.replace('uppercase', 'normal-case')}>
        Bk{bookId} · L{lessonId}
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
