import { AppIcon, SectionEyebrow, Skeleton } from '../../../lib/widgets';
import { useCharacterDecomposition } from '../hooks/useWordExtras';

const GLYPH_BUTTON =
  'flex h-12 w-12 shrink-0 items-center justify-center rounded-compact bg-ui-canvas font-chinese text-xl font-bold text-ui-ink-strong transition-colors hover:bg-ui-surface-hover focus-ring active:bg-ui-divider';

function DecompositionCard({
  char,
  onOpenCharacter,
}: {
  char: string;
  onOpenCharacter: (char: string) => void;
}) {
  const { components, pinyin, meaning, data } = useCharacterDecomposition(char);

  // Still loading and no cached breakdown yet.
  if (data === null) {
    return (
      <div className="flex min-h-[120px] w-full flex-col gap-3 rounded-feature bg-ui-surface p-4 shadow-[0_var(--depth-md)_0_var(--color-ui-border)]">
        <div className="flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-compact" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
        <div className="flex gap-1.5">
          <Skeleton className="h-12 w-12 rounded-compact" />
          <Skeleton className="h-12 w-12 rounded-compact" />
          <Skeleton className="h-12 w-12 rounded-compact" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[120px] w-full flex-col gap-3 rounded-feature bg-ui-surface p-4 shadow-[0_var(--depth-md)_0_var(--color-ui-border)]">
      <button
        type="button"
        aria-label={`Open breakdown for ${char}`}
        onClick={() => onOpenCharacter(char)}
        className="group flex w-full items-center gap-3 text-left rounded-compact focus-ring"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-compact bg-ui-canvas font-chinese text-2xl font-bold leading-none text-ui-ink-strong transition-colors group-hover:bg-ui-surface-hover">
          {char}
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          {pinyin && <span className="text-xs font-extrabold text-brand-primary">{pinyin}</span>}
          {meaning && (
            <span className="line-clamp-2 text-xs font-bold leading-snug text-ui-muted">{meaning}</span>
          )}
        </span>
      </button>

      {components.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {components.slice(0, 6).map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Open ${c} in the dictionary`}
              onClick={() => onOpenCharacter(c)}
              className={GLYPH_BUTTON}
            >
              {c}
            </button>
          ))}
          {components.length > 6 && (
            <button
              type="button"
              onClick={() => onOpenCharacter(char)}
              aria-label={`See all ${components.length} parts of ${char}`}
              className={GLYPH_BUTTON}
            >
              <AppIcon name="forward" size={16} />
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs font-bold text-ui-muted">No breakdown available</p>
      )}
    </div>
  );
}

export function WordDecompositionStrip({
  word,
  onOpenCharacter,
}: {
  word: string;
  onOpenCharacter: (char: string) => void;
}) {
  const chars = Array.from(word).filter((c) => /[\u3400-\u9FFF]/u.test(c));
  if (chars.length === 0) return null;

  return (
    <section aria-labelledby="word-decomposition-heading" className="flex w-full flex-col gap-3">
      <SectionEyebrow id="word-decomposition-heading" title="Character Breakdown" count={chars.length} />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {chars.map((char) => (
          <DecompositionCard key={char} char={char} onOpenCharacter={onOpenCharacter} />
        ))}
      </div>
    </section>
  );
}
