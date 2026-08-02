import { DBDictionaryRow } from '../types/database';
import { DICTIONARY_SHARD_COUNT, getDictionaryShard } from '../utils/dictionaryShard';
import { fetchStaticJson, pruneStaticJsonCache, removeStaticJsonCache } from './staticContentService';

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
const shardCache = new Map<number, DBDictionaryRow[]>();
const pendingShards = new Map<number, Promise<DBDictionaryRow[] | null>>();
let manifestPromise: Promise<DictionaryManifest> | null = null;

async function getManifest(): Promise<DictionaryManifest> {
  if (manifestPromise) return manifestPromise;

  manifestPromise = fetchStaticJson<DictionaryManifest>(
    '/data/dictionary/manifest.json',
    'dictionary manifest',
    { revalidate: true },
  ).then((manifest) => {
    const valid = manifest.schemaVersion === 1
      && typeof manifest.version === 'string'
      && manifest.shardStrategy === 'word-hash-modulo'
      && manifest.shardCount === DICTIONARY_SHARD_COUNT
      && manifest.shards.length === DICTIONARY_SHARD_COUNT;
    if (!valid) throw new Error('Unsupported dictionary manifest');
    void pruneStaticJsonCache('dictionary', manifest.version);
    return manifest;
  }).catch((error) => {
    manifestPromise = null;
    throw error;
  });

  return manifestPromise;
}

function isValidPack(pack: DictionaryPack, manifestShard: DictionaryManifestShard): boolean {
  if (pack.schemaVersion !== 1 || pack.shard !== manifestShard.shard) return false;
  if (!Array.isArray(pack.items) || pack.count !== pack.items.length) return false;
  if (pack.count !== manifestShard.count) return false;

  return pack.items.every((item) => (
    item
    && Number.isInteger(item.id)
    && typeof item.traditional === 'string'
    && typeof item.simplified === 'string'
    && [item.traditional, item.simplified].some((word) => getDictionaryShard(word) === pack.shard)
  ));
}

async function loadShard(
  shard: number,
  manifest: DictionaryManifest,
): Promise<DBDictionaryRow[] | null> {
  const cached = shardCache.get(shard);
  if (cached) return cached;

  const pending = pendingShards.get(shard);
  if (pending) return pending;

  const request = (async () => {
    try {
      const manifestShard = manifest.shards.find((item) => item.shard === shard);
      if (!manifestShard || !manifestShard.path.startsWith('/data/dictionary/')) return null;

      const persistentKey = `dictionary:${manifest.version}:shard:${shard}`;
      const pack = await fetchStaticJson<DictionaryPack>(
        manifestShard.path,
        `dictionary shard ${shard}`,
        { persistentKey },
      );
      if (!isValidPack(pack, manifestShard)) {
        await removeStaticJsonCache(persistentKey);
        throw new Error(`Dictionary shard ${shard} failed validation`);
      }

      shardCache.set(shard, pack.items);
      return pack.items;
    } finally {
      pendingShards.delete(shard);
    }
  })();

  pendingShards.set(shard, request);
  return request;
}

export async function fetchDictionaryRowsFromPacks(
  words: string[],
): Promise<Map<string, DBDictionaryRow[]>> {
  const results = new Map<string, DBDictionaryRow[]>();

  try {
    const manifest = await getManifest();
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
      const rows = await loadShard(shard, manifest);
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
