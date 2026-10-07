import type { ResolvedLevel } from '../../utils/lesson/levels';
import { AppIcon } from './AppIcon';
import { LevelTag } from './LevelTag';

/**
 * Compact tappable character tile for grids of related characters
 * (breakdown "Found in", sound ladder, Library "Learn next"): glyph, pinyin,
 * and where the learner meets it (`LevelTag`: lesson first, else TBCL level).
 *
 * `known` adds a check (passed in a course word); `upcoming` dims a
 * character from a later book; `active` rings the tile (e.g. now playing).
 */
export function CharacterTile({
  glyph,
  pinyin,
  bookId,
  lessonId,
  level,
  known = false,
  upcoming = false,
  active = false,
  onClick,
  ariaLabel,
}: {
  glyph: string;
  pinyin?: string;
  bookId?: number;
  lessonId?: number;
  level?: ResolvedLevel | null;
  known?: boolean;
  upcoming?: boolean;
  active?: boolean;
  onClick: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? `Open ${glyph}${known ? ' (known)' : ''}`}
      className={`relative flex min-w-0 flex-col items-center gap-0.5 rounded-compact border-b-[length:var(--depth-sm)] px-1 pb-1.5 pt-2 transition-[background-color,box-shadow,opacity] hover:bg-ui-hover focus-ring ${
        known ? 'border-feedback-success-edge/40 bg-feedback-success-surface/50' : 'border-ui-border bg-ui-canvas'
      } ${upcoming && !known ? 'opacity-60' : ''} ${active ? 'ring-2 ring-brand-primary' : ''}`}
    >
      {known && (
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-feedback-success text-ui-surface" aria-hidden>
          <AppIcon name="check" size={10} />
        </span>
      )}
      <span className="font-chinese text-2xl leading-none text-ui-ink-strong">{glyph}</span>
      {pinyin && <span className="max-w-full truncate text-[10px] font-extrabold leading-tight text-brand-primary">{pinyin}</span>}
      <LevelTag bookId={bookId} lessonId={lessonId} level={level} />
    </button>
  );
}
