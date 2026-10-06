import { V3RuntimeTree } from '../../character-breakdown';

/**
 * The word's breakdown, drawn by the same tree the character breakdown uses:
 * one tile per character (pinyin, meaning, a dropdown for its parts), with the
 * parts hidden until a tile is opened. A single-character word shows that
 * character's own parts directly.
 */
export function WordDecompositionStrip({
  word,
  onOpenCharacter,
  accentHex,
  edgeHex,
}: {
  word: string;
  onOpenCharacter: (char: string) => void;
  accentHex?: string;
  edgeHex?: string;
}) {
  if (!/[㐀-鿿]/u.test(word)) return null;
  return (
    <V3RuntimeTree
      key={word}
      character={word}
      mode="summary"
      onGlyphClick={onOpenCharacter}
      accentHex={accentHex}
      edgeHex={edgeHex}
    />
  );
}
