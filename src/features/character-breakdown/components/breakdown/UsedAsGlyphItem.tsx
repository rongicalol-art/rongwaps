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
      className="flex h-14 min-w-14 items-center justify-center rounded-compact bg-ui-surface px-3 shadow-[0_2px_0_var(--color-ui-divider)] outline-none transition-[background-color,transform,box-shadow] hover:bg-ui-surface-hover active:translate-y-px active:shadow-[0_1px_0_var(--color-ui-divider)] focus-visible:ring-4 focus-visible:ring-brand-primary/25"
    >
      <CharacterGlyph character={character} className={`text-2xl leading-none ${accentClassName}`} />
    </button>
  );
}
