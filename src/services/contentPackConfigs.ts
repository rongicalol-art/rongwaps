import type { DBCharacterBreakdown } from '../types/database';
import { DICTIONARY_SHARD_COUNT, getDictionaryShard } from '../utils/dictionaryShard';
import {
  type ContentPackKind,
  type PackConfig,
  type SoundHookEntry,
  type MemoryHookPack,
  type SoundHookPack,
  getBookParts,
  getBreakdownShard,
  getShardParts,
  isValidMemoryHookPack,
  isValidSoundHookPack,
  isValidReadingsPack,
  isValidGrammarPack,
  isValidDialogueAlignmentPack,
  packItemsToMnemonicMap,
} from '../utils/packValidators';

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
  readings: {
    namespace: 'readings',
    manifestPath: '/data/readings/manifest.json',
    manifestLabel: 'readings manifest',
    partPathPrefix: '/data/readings/',
    partCacheKeyKind: 'book',
    partLabel: (bookId) => `readings pack book ${bookId}`,
    validateManifest: (m) => m.schemaVersion === 1 && typeof m.version === 'string' && Array.isArray(m.books),
    getParts: getBookParts,
    validatePack: (pack, part) => isValidReadingsPack(pack, part.key, part.count),
    transform: (pack) => (pack as { items: unknown }).items,
  },
  grammar: {
    namespace: 'grammar',
    manifestPath: '/data/grammar/manifest.json',
    manifestLabel: 'grammar manifest',
    partPathPrefix: '/data/grammar/',
    partCacheKeyKind: 'book',
    partLabel: (bookId) => `grammar pack book ${bookId}`,
    validateManifest: (m) => m.schemaVersion === 1 && typeof m.version === 'string' && Array.isArray(m.books),
    getParts: getBookParts,
    validatePack: (pack, part) => isValidGrammarPack(pack, part.key, part.count),
    transform: (pack) => (pack as { items: unknown }).items,
  },
  'dialogue-alignment': {
    namespace: 'dialogue-alignment',
    manifestPath: '/data/dialogue-alignment/manifest.json',
    manifestLabel: 'dialogue alignment manifest',
    partPathPrefix: '/data/dialogue-alignment/',
    partCacheKeyKind: 'book',
    partLabel: (bookId) => `dialogue alignment pack book ${bookId}`,
    validateManifest: (m) => m.schemaVersion === 1 && typeof m.version === 'string' && Array.isArray(m.books),
    getParts: getBookParts,
    validatePack: (pack, part) => isValidDialogueAlignmentPack(pack, part.key, part.count),
    transform: (pack) => (pack as { items: unknown }).items,
  },
};
