import { createPackLoader } from './packLoader';

/**
 * Static memory-hook packs (`public/data/memory-hooks/`) keyed like the
 * `mnemonics` table: `{char}` for characters, `word_{text}` for words.
 * Pack-first; callers fall back to the database on a miss.
 */

export interface MemoryHookPackItem {
  id: string;
  character: string;
  mnemonic: string;
  content_type: string;
}

export interface MemoryHookPack {
  schemaVersion: number;
  bookId: number;
  count: number;
  items: MemoryHookPackItem[];
}

interface MemoryHookManifest {
  schemaVersion: number;
  version: string;
  totalCount: number;
  books: Array<{ bookId: number; count: number; path: string }>;
}

const VALID_CONTENT_TYPES = new Set(['character', 'word', 'story']);

export function isValidMemoryHookItem(item: unknown): item is MemoryHookPackItem {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Record<string, unknown>;
  return typeof candidate.id === 'string'
    && candidate.id.length > 0
    && typeof candidate.character === 'string'
    && typeof candidate.mnemonic === 'string'
    && candidate.mnemonic.length > 0
    && typeof candidate.content_type === 'string'
    && VALID_CONTENT_TYPES.has(candidate.content_type);
}

export function isValidMemoryHookPack(pack: unknown, bookId: number, expectedCount: number): pack is MemoryHookPack {
  if (!pack || typeof pack !== 'object') return false;
  const candidate = pack as Partial<MemoryHookPack>;
  return candidate.schemaVersion === 1
    && candidate.bookId === bookId
    && candidate.count === expectedCount
    && Array.isArray(candidate.items)
    && candidate.items.length === candidate.count
    && candidate.items.every(isValidMemoryHookItem);
}

export function packItemsToMnemonicMap(items: MemoryHookPackItem[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of items) map.set(item.id, item.mnemonic);
  return map;
}

const memoryHookPackLoader = createPackLoader<MemoryHookManifest, MemoryHookPack, Map<string, string>>({
  namespace: 'memory-hooks',
  manifestPath: '/data/memory-hooks/manifest.json',
  manifestLabel: 'memory hook manifest',
  partPathPrefix: '/data/memory-hooks/',
  partCacheKeyKind: 'book',
  partLabel: (bookId) => `memory hook pack book ${bookId}`,
  validateManifest: (manifest) => (
    manifest.schemaVersion === 1
    && typeof manifest.version === 'string'
    && Number.isInteger(manifest.totalCount)
    && manifest.totalCount > 0
    && Array.isArray(manifest.books)
    && manifest.books.reduce((total, book) => total + book.count, 0) === manifest.totalCount
  ),
  getParts: (manifest) => manifest.books.map((book) => ({
    key: book.bookId,
    path: book.path,
    count: book.count,
  })),
  validatePack: (pack, part) => isValidMemoryHookPack(pack, part.key, part.count),
  transform: (pack) => packItemsToMnemonicMap(pack.items),
});

let hookMapPromise: Promise<Map<string, string>> | null = null;

/**
 * Resolves a mnemonic from the pack map with resilient fallback for single characters:
 * if key is 'word_妈' and not found, falls back to '妈';
 * if key is '妈' and not found, falls back to 'word_妈'.
 */
export function resolveMnemonicFromMap(map: Map<string, string>, cacheKey: string): string | null {
  const direct = map.get(cacheKey);
  if (direct) return direct;
  if (cacheKey.startsWith('word_')) {
    const stripped = cacheKey.slice(5);
    if ([...stripped].length === 1) {
      return map.get(stripped) ?? null;
    }
  } else if ([...cacheKey].length === 1) {
    return map.get(`word_${cacheKey}`) ?? null;
  }
  return null;
}

/** Pack-first lookup. Returns null on any miss or pack failure so callers can use the database. */
export async function lookupPackMnemonic(cacheKey: string): Promise<string | null> {
  try {
    hookMapPromise ??= (async () => {
      const parts = await memoryHookPackLoader.loadAllParts();
      const map = new Map<string, string>();
      for (const part of parts) {
        for (const [key, value] of part) map.set(key, value);
      }
      return map;
    })();
    const map = await hookMapPromise;
    return resolveMnemonicFromMap(map, cacheKey);
  } catch (error) {
    console.warn('Static memory hook pack unavailable; using database fallback.', error);
    hookMapPromise = null;
    return null;
  }
}

/** Test-only: clears the in-memory pack cache. */
export function resetMemoryHookPackCache(): void {
  hookMapPromise = null;
}
