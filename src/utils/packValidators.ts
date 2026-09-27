import type { DBCharacterBreakdown } from '../types/database';
import type { Flashcard } from '../data/flashcards';
import type { CourseExampleRecord } from '../types/models';
import { sentenceMatchesForms } from '../utils/courseExamples';
import { DICTIONARY_SHARD_COUNT, getDictionaryShard } from '../utils/dictionaryShard';
import type { PackPart } from '../services/packLoader';

export interface GenericManifestPart { key: number; path: string; count: number; }

export interface GenericContentManifest {
  schemaVersion: number;
  version: string;
  totalCount?: number;
  shardCount?: number;
  shardStrategy?: string;
  books?: Array<{ bookId: number; count: number; path: string; sha256?: string; bytes?: number }>;
  shards?: Array<{ shard: number; count: number; path: string; sha256?: string; bytes?: number }>;
}

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

export interface SoundHookPhonetic { glyph: string; reading: string; shift: string; }

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

export type ContentPackKind =
  | 'vocabulary'
  | 'breakdowns'
  | 'dictionary'
  | 'course-examples'
  | 'memory-hooks'
  | 'sound-hooks';

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

export function resolveMnemonicFromMap(map: Map<string, string>, cacheKey: string): string | null {
  const direct = map.get(cacheKey);
  if (direct) return direct;
  if (cacheKey.startsWith('word_')) {
    const stripped = cacheKey.slice(5);
    if ([...stripped].length === 1) return map.get(stripped) ?? null;
  } else if ([...cacheKey].length === 1) {
    return map.get(`word_${cacheKey}`) ?? null;
  }
  return null;
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

export function getBreakdownShard(character: string, shardCount: number): number {
  const codePoint = character.codePointAt(0);
  return codePoint === undefined ? -1 : codePoint % shardCount;
}

export const getBookParts = (m: GenericContentManifest): PackPart[] => (m.books || []).map((b) => ({
  key: b.bookId,
  path: b.path,
  count: b.count,
}));

export const getShardParts = (m: GenericContentManifest): PackPart[] => (m.shards || []).map((s) => ({
  key: s.shard,
  path: s.path,
  count: s.count,
}));

export interface PackConfig<TPack, TLoaded> {
  namespace: string;
  manifestPath: string;
  manifestLabel: string;
  partPathPrefix: string;
  partCacheKeyKind: string;
  partLabel: (key: number) => string;
  validateManifest: (manifest: GenericContentManifest) => boolean;
  getParts: (manifest: GenericContentManifest) => PackPart[];
  validatePack: (pack: TPack, part: PackPart, manifest: GenericContentManifest) => boolean;
  transform?: (pack: TPack) => TLoaded;
}

export const PACK_CONFIGS: Record<ContentPackKind, PackConfig<unknown, unknown>> = {
  vocabulary: {
    namespace: 'vocabulary',
    manifestPath: '/data/vocabulary/manifest.json',
    manifestLabel: 'vocabulary manifest',
    partPathPrefix: '/data/vocabulary/',
    partCacheKeyKind: 'book',
    partLabel: (bookId) => `vocabulary pack book ${bookId}`,
    validateManifest: (m) => m.schemaVersion === 1 && typeof m.version === 'string' && (m.totalCount ?? 0) > 0 && Array.isArray(m.books) && m.books.reduce((t, b) => t + b.count, 0) === m.totalCount,
    getParts: getBookParts,
    validatePack: (pack, part) => {
      const p = pack as { schemaVersion?: number; bookId?: number; count?: number; items?: Array<{ id?: string }> };
      if (p.schemaVersion !== 1 || p.bookId !== part.key || !Array.isArray(p.items) || p.count !== p.items.length || p.count !== part.count) return false;
      return p.items.every((item) => {
        if (!item || typeof item.id !== 'string') return false;
        const match = item.id.match(/^b(\d+)[-_]?l\d+/i);
        return Boolean(match && Number(match[1]) === p.bookId);
      });
    },
    transform: (pack) => (pack as { items: unknown }).items,
  },
  breakdowns: {
    namespace: 'breakdowns',
    manifestPath: '/data/breakdowns/manifest.json',
    manifestLabel: 'breakdown manifest',
    partPathPrefix: '/data/breakdowns/',
    partCacheKeyKind: 'shard',
    partLabel: (shard) => `breakdown shard ${shard}`,
    validateManifest: (m) => m.schemaVersion === 1 && typeof m.version === 'string' && m.shardStrategy === 'unicode-code-point-modulo' && (m.shardCount ?? 0) > 0 && (m.shards?.length ?? 0) === m.shardCount,
    getParts: getShardParts,
    validatePack: (pack, part, manifest) => {
      const p = pack as { schemaVersion?: number; shard?: number; count?: number; items?: Array<{ character?: string }> };
      if (p.schemaVersion !== 1 || p.shard !== part.key || !Array.isArray(p.items) || p.count !== p.items.length || p.count !== part.count) return false;
      return p.items.every((item) => item && typeof item.character === 'string' && getBreakdownShard(item.character, manifest.shardCount!) === p.shard);
    },
    transform: (pack) => new Map<string, DBCharacterBreakdown>((pack as { items: DBCharacterBreakdown[] }).items.map((item) => [item.character, item])),
  },
  dictionary: {
    namespace: 'dictionary',
    manifestPath: '/data/dictionary/manifest.json',
    manifestLabel: 'dictionary manifest',
    partPathPrefix: '/data/dictionary/',
    partCacheKeyKind: 'shard',
    partLabel: (shard) => `dictionary shard ${shard}`,
    validateManifest: (m) => m.schemaVersion === 1 && typeof m.version === 'string' && m.shardStrategy === 'word-hash-modulo' && m.shardCount === DICTIONARY_SHARD_COUNT && (m.shards?.length ?? 0) === DICTIONARY_SHARD_COUNT,
    getParts: getShardParts,
    validatePack: (pack, part) => {
      const p = pack as { schemaVersion?: number; shard?: number; count?: number; items?: Array<{ id?: number; traditional?: string; simplified?: string }> };
      if (p.schemaVersion !== 1 || p.shard !== part.key || !Array.isArray(p.items) || p.count !== p.items.length || p.count !== part.count) return false;
      return p.items.every((item) => item && Number.isInteger(item.id) && typeof item.traditional === 'string' && typeof item.simplified === 'string' && [item.traditional, item.simplified].some((word) => getDictionaryShard(word) === p.shard));
    },
    transform: (pack) => (pack as { items: unknown }).items,
  },
  'course-examples': {
    namespace: 'course-examples',
    manifestPath: '/data/course-examples/manifest.json',
    manifestLabel: 'course example manifest',
    partPathPrefix: '/data/course-examples/',
    partCacheKeyKind: 'book',
    partLabel: (bookId) => `course examples book ${bookId}`,
    validateManifest: (m) => m.schemaVersion === 1 && typeof m.version === 'string' && Array.isArray(m.books),
    getParts: getBookParts,
    validatePack: (pack, part, manifest) => {
      const p = pack as { schemaVersion?: number; bookId?: number; count?: number; records?: unknown[] };
      return p.schemaVersion === manifest.schemaVersion && p.bookId === part.key && p.count === p.records?.length && p.count === part.count;
    },
    transform: (pack) => (pack as { records: unknown }).records,
  },
  'memory-hooks': {
    namespace: 'memory-hooks',
    manifestPath: '/data/memory-hooks/manifest.json',
    manifestLabel: 'memory hook manifest',
    partPathPrefix: '/data/memory-hooks/',
    partCacheKeyKind: 'book',
    partLabel: (bookId) => `memory hook pack book ${bookId}`,
    validateManifest: (m) => m.schemaVersion === 1 && typeof m.version === 'string' && (m.totalCount ?? 0) > 0 && Array.isArray(m.books) && m.books.reduce((t, b) => t + b.count, 0) === m.totalCount,
    getParts: getBookParts,
    validatePack: (pack, part) => isValidMemoryHookPack(pack, part.key, part.count),
    transform: (pack) => packItemsToMnemonicMap((pack as MemoryHookPack).items),
  },
  'sound-hooks': {
    namespace: 'sound-hooks',
    manifestPath: '/data/sound-hooks/manifest.json',
    manifestLabel: 'sound hook manifest',
    partPathPrefix: '/data/sound-hooks/',
    partCacheKeyKind: 'book',
    partLabel: (bookId) => `sound hook pack book ${bookId}`,
    validateManifest: (m) => m.schemaVersion === 1 && typeof m.version === 'string' && (m.totalCount ?? 0) > 0 && Array.isArray(m.books) && m.books.reduce((t, b) => t + b.count, 0) === m.totalCount,
    getParts: getBookParts,
    validatePack: (pack, part) => isValidSoundHookPack(pack, part.key, part.count),
    transform: (pack) => new Map<string, SoundHookEntry>(((pack as SoundHookPack).items).map((item: SoundHookEntry) => [item.character, item])),
  },
};

export function recordsToExampleCards(
  records: CourseExampleRecord[],
  searchTerms: string[],
  pos?: string,
): Flashcard[] {
  const terms = Array.from(new Set(searchTerms.map((term) => term.trim()).filter(Boolean)));
  if (terms.length === 0) return [];

  const matching = records.filter((r) => (
    sentenceMatchesForms(r.traditional, terms, pos) || sentenceMatchesForms(r.simplified, terms, pos)
  ));
  const cards = new Map<string, Flashcard>();

  matching.forEach((r) => {
    const existing = cards.get(r.sourceCardId);
    const example = { chinese: r.traditional, pinyin: r.pinyin, english: r.english };
    if (existing) {
      if (!existing.examples?.some((item) => item.chinese === example.chinese)) {
        existing.examples?.push(example);
      }
      return;
    }
    cards.set(r.sourceCardId, {
      id: r.sourceCardId,
      bookId: r.bookId,
      lessonId: r.lessonId,
      partId: r.partId,
      front: r.sourceFront,
      back: r.sourceMeaning,
      examples: [example],
    });
  });

  return [...cards.values()];
}
