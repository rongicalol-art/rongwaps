import { DBDictionaryRow } from '../types/database';
import { DICTIONARY_SHARD_COUNT, getDictionaryShard } from '../utils/dictionaryShard';
import { createPackLoader } from './packLoader';

interface DictionaryManifestShard {
  shard: number;
  count: number;
  path: string;
}

interface DictionaryManifest {
  schemaVersion: number;
  version: string;
  shardCount: number;
  shardStrategy: string;
  shards: DictionaryManifestShard[];
}

interface DictionaryPack {
  schemaVersion: number;
  shard: number;
  count: number;
  items: DBDictionaryRow[];
}

const MAX_STATIC_BATCH_WORDS = 20;
const MAX_STATIC_BATCH_SHARDS = 4;

const dictionaryPackLoader = createPackLoader<DictionaryManifest, DictionaryPack, DBDictionaryRow[]>({
  namespace: 'dictionary',
  manifestPath: '/data/dictionary/manifest.json',
  manifestLabel: 'dictionary manifest',
  partPathPrefix: '/data/dictionary/',
  partCacheKeyKind: 'shard',
  partLabel: (shard) => `dictionary shard ${shard}`,
  validateManifest: (manifest) => (
    manifest.schemaVersion === 1
    && typeof manifest.version === 'string'
    && manifest.shardStrategy === 'word-hash-modulo'
    && manifest.shardCount === DICTIONARY_SHARD_COUNT
    && manifest.shards.length === DICTIONARY_SHARD_COUNT
  ),
  getParts: (manifest) => manifest.shards.map((shard) => ({
    key: shard.shard,
    path: shard.path,
    count: shard.count,
  })),
  validatePack: (pack, part) => {
    if (pack.schemaVersion !== 1 || pack.shard !== part.key) return false;
    if (!Array.isArray(pack.items) || pack.count !== pack.items.length) return false;
    if (pack.count !== part.count) return false;

    return pack.items.every((item) => (
      item
      && Number.isInteger(item.id)
      && typeof item.traditional === 'string'
      && typeof item.simplified === 'string'
      && [item.traditional, item.simplified].some((word) => getDictionaryShard(word) === pack.shard)
    ));
  },
  transform: (pack) => pack.items,
});

export async function fetchDictionaryRowsFromPacks(
  words: string[],
): Promise<Map<string, DBDictionaryRow[]>> {
  const results = new Map<string, DBDictionaryRow[]>();

  try {
    const manifest = await dictionaryPackLoader.manifest();
    const uniqueWords = [...new Set(words.map((word) => word.trim()).filter(Boolean))];
    const wordsByShard = new Map<number, Set<string>>();

    for (const word of uniqueWords) {
      const shard = getDictionaryShard(word);
      const shardWords = wordsByShard.get(shard) || new Set<string>();
      shardWords.add(word);
      wordsByShard.set(shard, shardWords);
    }

    if (
      uniqueWords.length > MAX_STATIC_BATCH_WORDS
      || wordsByShard.size > MAX_STATIC_BATCH_SHARDS
    ) {
      return results;
    }

    await Promise.all([...wordsByShard.entries()].map(async ([shard, shardWords]) => {
      const rows = await dictionaryPackLoader.loadPart(shard);
      if (!rows) return;

      for (const word of shardWords) {
        const matches = rows.filter((row) => row.traditional === word || row.simplified === word);
        if (matches.length > 0) results.set(word, matches);
      }
    }));
  } catch (error) {
    console.warn('Static dictionary packs unavailable; using Supabase.', error);
  }

  return results;
}
