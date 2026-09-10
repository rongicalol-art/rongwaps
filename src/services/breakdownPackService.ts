import { DBCharacterBreakdown } from '../types/database';
import { fetchStaticJson, removeStaticJsonCache } from './staticContentService';
import { createPackLoader } from './packLoader';

interface BreakdownManifestShard {
  shard: number;
  count: number;
  path: string;
}

interface BreakdownManifest {
  schemaVersion: number;
  version: string;
  shardCount: number;
  shardStrategy: string;
  shards: BreakdownManifestShard[];
}

interface BreakdownPack {
  schemaVersion: number;
  shard: number;
  count: number;
  items: DBCharacterBreakdown[];
}

interface UsedAsPack {
  schemaVersion: number;
  version: string;
  componentCount: number;
  entryCount: number;
  entries: Record<string, string[]>;
}

const MAX_STATIC_BATCH_CHARACTERS = 20;
const MAX_STATIC_BATCH_SHARDS = 4;

let usedAsCache: Record<string, string[]> | null = null;
let usedAsPromise: Promise<Record<string, string[]> | null> | null = null;

function getShard(character: string, shardCount: number): number {
  const codePoint = character.codePointAt(0);
  if (codePoint === undefined) return -1;
  return codePoint % shardCount;
}

const breakdownPackLoader = createPackLoader<BreakdownManifest, BreakdownPack, Map<string, DBCharacterBreakdown>>({
  namespace: 'breakdowns',
  manifestPath: '/data/breakdowns/manifest.json',
  manifestLabel: 'breakdown manifest',
  partPathPrefix: '/data/breakdowns/',
  partCacheKeyKind: 'shard',
  partLabel: (shard) => `breakdown shard ${shard}`,
  validateManifest: (manifest) => (
    manifest.schemaVersion === 1
    && typeof manifest.version === 'string'
    && manifest.shardStrategy === 'unicode-code-point-modulo'
    && manifest.shardCount > 0
    && manifest.shards.length === manifest.shardCount
  ),
  getParts: (manifest) => manifest.shards.map((shard) => ({
    key: shard.shard,
    path: shard.path,
    count: shard.count,
  })),
  validatePack: (pack, part, manifest) => {
    if (pack.schemaVersion !== 1 || pack.shard !== part.key) return false;
    if (!Array.isArray(pack.items) || pack.count !== pack.items.length) return false;
    if (pack.count !== part.count) return false;

    return pack.items.every((item) => (
      item
      && typeof item.character === 'string'
      && getShard(item.character, manifest.shardCount) === pack.shard
    ));
  },
  transform: (pack) => new Map(pack.items.map((item) => [item.character, item])),
});

export async function fetchBreakdownsFromPacks(
  characters: string[],
): Promise<Record<string, DBCharacterBreakdown>> {
  const results: Record<string, DBCharacterBreakdown> = {};

  try {
    const manifest = await breakdownPackLoader.manifest();
    const charactersByShard = new Map<number, Set<string>>();
    const uniqueCharacters = [...new Set(characters.filter(Boolean))];

    for (const character of uniqueCharacters) {
      const shard = getShard(character, manifest.shardCount);
      const shardCharacters = charactersByShard.get(shard) || new Set<string>();
      shardCharacters.add(character);
      charactersByShard.set(shard, shardCharacters);
    }

    if (
      uniqueCharacters.length > MAX_STATIC_BATCH_CHARACTERS
      || charactersByShard.size > MAX_STATIC_BATCH_SHARDS
    ) {
      return results;
    }

    await Promise.all([...charactersByShard.entries()].map(async ([shard, shardCharacters]) => {
      const indexed = await breakdownPackLoader.loadPart(shard);
      if (!indexed) return;

      for (const character of shardCharacters) {
        const breakdown = indexed.get(character);
        if (breakdown) results[character] = breakdown;
      }
    }));
  } catch (error) {
    console.warn('Static breakdown packs unavailable; using Supabase.', error);
  }

  return results;
}

/**
 * Loads the static component -> characters inverted index
 * (`public/data/breakdowns/used-as.json`, version-keyed in IndexedDB like the
 * shards). Returns null when packs are unavailable; callers fall back to the
 * database `decomposition LIKE` query.
 */
export async function fetchUsedAsFromPacks(): Promise<Record<string, string[]> | null> {
  if (usedAsCache) return usedAsCache;
  if (usedAsPromise) return usedAsPromise;

  usedAsPromise = (async () => {
    try {
      const manifest = await breakdownPackLoader.manifest();
      const persistentKey = `breakdowns:${manifest.version}:used-as`;
      const pack = await fetchStaticJson<UsedAsPack>(
        '/data/breakdowns/used-as.json',
        'breakdown used-as index',
        { persistentKey },
      );
      if (
        pack.schemaVersion !== 1
        || typeof pack.entries !== 'object'
        || pack.entries === null
      ) {
        await removeStaticJsonCache(persistentKey);
        return null;
      }
      usedAsCache = pack.entries;
      return pack.entries;
    } catch (error) {
      console.warn('Static used-as index unavailable; using Supabase.', error);
      return null;
    } finally {
      usedAsPromise = null;
    }
  })();

  return usedAsPromise;
}
