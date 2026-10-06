import type { DBCharacterBreakdown } from '../types/database';
import { DICTIONARY_SHARD_COUNT, getDictionaryShard } from '../utils/dictionaryShard';
import {
  type ContentPackKind,
  type PackConfig,
  type MemoryHookPack,
  getBookParts,
  getBreakdownShard,
  getShardParts,
  isValidMemoryHookPack,
  isValidReadingsPack,
  isValidGrammarPack,
  isValidDialogueAlignmentPack,
  isValidStrokePack,
  isValidLevelPack,
  isValidPartsPack,
  partsPackToIndex,
  type PartsPack,
  isValidPronunciationPack,
  pronunciationPackToIndex,
  type PronunciationPack,
  levelPackToIndex,
  type LevelPack,
  type StrokePack,
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
    validateManifest: (m) => (m.schemaVersion === 1 || m.schemaVersion === 2) && typeof m.version === 'string' && m.shardStrategy === 'word-hash-modulo' && m.shardCount === DICTIONARY_SHARD_COUNT && (m.shards?.length ?? 0) === DICTIONARY_SHARD_COUNT,
    getParts: getShardParts,
    validatePack: (pack, part) => {
      const p = pack as { schemaVersion?: number; shard?: number; count?: number; items?: unknown[] };
      if ((p.schemaVersion !== 1 && p.schemaVersion !== 2) || p.shard !== part.key || !Array.isArray(p.items) || p.count !== p.items.length || p.count !== part.count) return false;
      if (p.schemaVersion === 2) {
        return (p.items as [number, string, string, string, unknown][]).every(
          (item) => Array.isArray(item) && Number.isInteger(item[0]) && typeof item[1] === 'string' && typeof item[2] === 'string' && [item[1], item[2] || item[1]].some((word) => getDictionaryShard(word) === p.shard),
        );
      }
      return (p.items as Array<{ id?: number; traditional?: string; simplified?: string }>).every(
        (item) => item && Number.isInteger(item.id) && typeof item.traditional === 'string' && typeof item.simplified === 'string' && [item.traditional, item.simplified].some((word) => getDictionaryShard(word) === p.shard),
      );
    },
    transform: (pack) => {
      const p = pack as { schemaVersion?: number; items: unknown[] };
      if (p.schemaVersion === 2) {
        return (p.items as [number, string, string, string, unknown][]).map(
          ([id, simplified, traditional, pinyin_accented, definitions]) => ({
            id,
            simplified,
            traditional: traditional || simplified,
            pinyin_accented,
            definitions,
          }),
        );
      }
      return p.items;
    },
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
  strokes: {
    namespace: 'strokes',
    manifestPath: '/data/strokes/manifest.json',
    manifestLabel: 'strokes manifest',
    partPathPrefix: '/data/strokes/',
    partCacheKeyKind: 'shard',
    partLabel: (shard) => `strokes shard ${shard}`,
    validateManifest: (m) => m.schemaVersion === 1 && typeof m.version === 'string' && m.shardStrategy === 'unicode-code-point-modulo' && (m.shardCount ?? 0) > 0 && (m.shards?.length ?? 0) === m.shardCount,
    getParts: getShardParts,
    validatePack: (pack, part, manifest) => {
      if (!isValidStrokePack(pack, part.key, part.count)) return false;
      return pack.items.every((item) => getBreakdownShard(item.character, manifest.shardCount!) === part.key);
    },
    transform: (pack) => new Map(
      (pack as StrokePack).items.map((item) => [
        item.character,
        {
          strokes: item.strokes,
          medians: item.medians,
          ...(item.radStrokes ? { radStrokes: item.radStrokes } : {}),
        },
      ]),
    ),
  },
  levels: {
    namespace: 'levels',
    manifestPath: '/data/levels/manifest.json',
    manifestLabel: 'Levels manifest',
    partPathPrefix: '/data/levels/',
    partCacheKeyKind: 'shard',
    partLabel: () => 'Levels pack',
    validateManifest: (m) => m.schemaVersion === 1 && typeof m.version === 'string' && (m.shards?.length ?? 0) === 1,
    getParts: getShardParts,
    validatePack: (pack, part) => isValidLevelPack(pack, part.count),
    transform: (pack) => levelPackToIndex(pack as LevelPack),
  },
  parts: {
    namespace: 'parts',
    manifestPath: '/data/relations/manifest.json',
    manifestLabel: 'Parts manifest',
    partPathPrefix: '/data/relations/',
    partCacheKeyKind: 'shard',
    partLabel: () => 'Parts index',
    validateManifest: (m) => m.schemaVersion === 1 && typeof m.version === 'string' && (m.shards?.length ?? 0) === 1,
    getParts: getShardParts,
    validatePack: (pack, part) => isValidPartsPack(pack, part.count),
    transform: (pack) => partsPackToIndex(pack as PartsPack),
  },
  pronunciation: {
    namespace: 'pronunciation',
    manifestPath: '/data/pronunciation/manifest.json',
    manifestLabel: 'Pronunciation manifest',
    partPathPrefix: '/data/pronunciation/',
    partCacheKeyKind: 'shard',
    partLabel: () => 'Pronunciation pack',
    validateManifest: (m) => m.schemaVersion === 1 && typeof m.version === 'string' && (m.shards?.length ?? 0) === 1,
    getParts: getShardParts,
    validatePack: (pack, part) => isValidPronunciationPack(pack, part.count),
    transform: (pack) => pronunciationPackToIndex(pack as PronunciationPack),
  },
};
