import { CharacterGlyph } from './CharacterGlyph';

export function UsedAsGlyphItem({
  character,
  accentClassName,
  onClick,
}: {
  character: string;
  accentClassName: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open breakdown for ${character}`}
      className="flex h-14 min-w-14 items-center justify-center rounded-compact border border-ui-border bg-ui-surface px-3 shadow-[0_var(--depth-sm)_0_var(--color-ui-divider)] transition-[background-color,transform,box-shadow] hover:bg-ui-surface-hover active:translate-y-[length:var(--depth-sm)] active:shadow-none focus-ring"
    >
      <CharacterGlyph character={character} className={`text-2xl leading-none ${accentClassName}`} />
    </button>
  );
}
