export type SoundParentLookup = (
  componentKey: string,
) => Promise<{ status: string; parents: string[] }>;

export interface SoundRevealPathOptions {
  /** The character whose tree is open (its direct children are depth 1). */
  character: string;
  /** The phonetic piece's glyph, as stored in the sound pack. */
  soundGlyph: string;
  /** Reverse-index lookup: component key -> structural parents. */
  getParents: SoundParentLookup;
  /** Safety bound on how deep the walk may climb. */
  maxDepth?: number;
}

/**
 * Resolves which tree nodes must be expanded so a nested phonetic piece
 * becomes visible in the breakdown tree. Walks the runtime reverse index from
 * the sound glyph up to the character; returns the ancestor glyphs to expand,
 * outermost first. Returns an empty list when the glyph is already a direct
 * component, is not part of the tree, or the walk cannot reach the character.
 */
export async function resolveSoundRevealPath({
  character,
  soundGlyph,
  getParents,
  maxDepth = 4,
}: SoundRevealPathOptions): Promise<string[]> {
  if (!character || !soundGlyph || character === soundGlyph) return [];

  const startKey = `g:${soundGlyph}`;

  interface QueueEntry {
    key: string;
    /** Ancestors between the sound glyph and this node, innermost first. */
    path: string[];
  }

  const queue: QueueEntry[] = [{ key: startKey, path: [] }];
  const visited = new Set<string>([startKey]);

  while (queue.length > 0) {
    const entry = queue.shift()!;
    if (entry.path.length >= maxDepth) continue;

    const result = await getParents(entry.key);
    if (result.status !== 'found') continue;

    for (const rawParent of result.parents) {
      // The reverse index stores bare glyphs; tolerate prefixed keys defensively.
      const glyph = rawParent.startsWith('g:') ? rawParent.slice(2) : rawParent;
      if (!glyph) continue;

      const parentKey = `g:${glyph}`;
      if (visited.has(parentKey)) continue;
      if (glyph === character) return entry.path.slice().reverse();

      visited.add(parentKey);
      queue.push({ key: parentKey, path: [...entry.path, glyph] });
    }
  }

  return [];
}
