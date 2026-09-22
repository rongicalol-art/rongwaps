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
      className="flex h-14 min-w-14 items-center justify-center rounded-compact border border-ui-border border-b-[length:var(--depth-sm)] bg-ui-surface px-3 transition-[background-color,transform,border-color] hover:bg-ui-surface-hover active:scale-[0.97] focus-ring"
    >
      <CharacterGlyph character={character} className={`text-2xl leading-none ${accentClassName}`} />
    </button>
  );
}
