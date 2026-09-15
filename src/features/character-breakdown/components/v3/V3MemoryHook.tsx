import { MemoryHookBlock } from '../../../character-memory-hooks';
import { CharacterGlyph } from '../breakdown/CharacterGlyph';

/**
 * "Memory Hook" block for the V3 breakdown summary.
 * Thin adapter over the shared `MemoryHookBlock` so the character surface and
 * the dictionary word surface render the identical hook card.
 */
export function V3MemoryHook({ character }: { character: string }) {
  return (
    <MemoryHookBlock
      cacheKey={character}
      emptyText={(
        <>
          No memory hook available for
          {' '}
          <CharacterGlyph character={character} className="font-chinese text-sm inline" />
          {' '}
          yet.
        </>
      )}
    />
  );
}
