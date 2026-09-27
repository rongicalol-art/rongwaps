import { debugLogger } from '../utils/debugLogger';
import { createPackLoader } from './packLoader';

/**
 * Static Sound-pack (`public/data/sound-hooks/`) keyed by character. Purely
 * phonetic: pinyin, the phonetic piece with its reading and tone shift, and
 * the Book 1 sound family. No mnemonic content lives here.
 */

export interface SoundHookPhonetic {
  glyph: string;
  reading: string;
  shift: string;
}

export interface SoundHookEntry {
  id: string;
  character: string;
  meaning: string;
  pinyin: string;
  phonetic: SoundHookPhonetic | null;
  family: Array<{ character: string; pinyin: string; reading: string }>;
  needsHuman: boolean;
}

export interface SoundHookPack {
  schemaVersion: number;
  bookId: number;
  count: number;
  items: SoundHookEntry[];
}

interface SoundHookManifest {
  schemaVersion: number;
  version: string;
  totalCount: number;
  books: Array<{ bookId: number; count: number; path: string }>;
}

function isPhonetic(value: unknown): value is SoundHookPhonetic {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.glyph === 'string'
    && typeof candidate.reading === 'string'
    && typeof candidate.shift === 'string';
}

export function isValidSoundHookItem(item: unknown): item is SoundHookEntry {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Record<string, unknown>;
  return typeof candidate.id === 'string'
    && candidate.id.length > 0
    && typeof candidate.character === 'string'
    && typeof candidate.meaning === 'string'
    && typeof candidate.pinyin === 'string'
    && (candidate.phonetic === null || isPhonetic(candidate.phonetic))
    && Array.isArray(candidate.family)
    && typeof candidate.needsHuman === 'boolean';
}

export function isValidSoundHookPack(pack: unknown, bookId: number, expectedCount: number): pack is SoundHookPack {
  if (!pack || typeof pack !== 'object') return false;
  const candidate = pack as Partial<SoundHookPack>;
  return candidate.schemaVersion === 1
    && candidate.bookId === bookId
    && candidate.count === expectedCount
    && Array.isArray(candidate.items)
    && candidate.items.length === candidate.count
    && candidate.items.every(isValidSoundHookItem);
}

const soundHookLoader = createPackLoader<SoundHookManifest, SoundHookPack, Map<string, SoundHookEntry>>({
  namespace: 'sound-hooks',
  manifestPath: '/data/sound-hooks/manifest.json',
  manifestLabel: 'sound hook manifest',
  partPathPrefix: '/data/sound-hooks/',
  partCacheKeyKind: 'book',
  partLabel: (bookId) => `sound hook pack book ${bookId}`,
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
  validatePack: (pack, part) => isValidSoundHookPack(pack, part.key, part.count),
  transform: (pack) => new Map(pack.items.map((item) => [item.character, item])),
});

let soundMapPromise: Promise<Map<string, SoundHookEntry>> | null = null;

/** Pack-first lookup for a character's sound entry; null on any miss. */
export async function lookupSoundHook(character: string): Promise<SoundHookEntry | null> {
  try {
    soundMapPromise ??= (async () => {
      const parts = await soundHookLoader.loadAllParts();
      const map = new Map<string, SoundHookEntry>();
      for (const part of parts) {
        for (const [key, value] of part) map.set(key, value);
      }
      return map;
    })();
    const map = await soundMapPromise;
    return map.get(character) ?? null;
  } catch (error) {
    debugLogger.warn('Cache', 'Sound hook pack unavailable.', error);
    soundMapPromise = null;
    return null;
  }
}

/** Test-only: clears the in-memory pack cache. */
export function resetSoundHookPackCache(): void {
  soundMapPromise = null;
}
