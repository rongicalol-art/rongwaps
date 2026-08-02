import { DBCharacterBreakdown } from '../types/database';
import { fetchStaticJson, pruneStaticJsonCache, removeStaticJsonCache } from './staticContentService';

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

const shardCache = new Map<number, Map<string, DBCharacterBreakdown>>();
const pendingShards = new Map<number, Promise<Map<string, DBCharacterBreakdown> | null>>();
let manifestPromise: Promise<BreakdownManifest> | null = null;
const MAX_STATIC_BATCH_CHARACTERS = 20;
const MAX_STATIC_BATCH_SHARDS = 4;

function getShard(character: string, shardCount: number): number {
  const codePoint = character.codePointAt(0);
  if (codePoint === undefined) return -1;
  return codePoint % shardCount;
}

async function getManifest(): Promise<BreakdownManifest> {
  if (manifestPromise) return manifestPromise;

  manifestPromise = fetchStaticJson<BreakdownManifest>(
    '/data/breakdowns/manifest.json',
    'breakdown manifest',
    { revalidate: true },
  ).then((manifest) => {
    const valid = manifest.schemaVersion === 1
      && typeof manifest.version === 'string'
      && manifest.shardStrategy === 'unicode-code-point-modulo'
      && manifest.shardCount > 0
      && manifest.shards.length === manifest.shardCount;
    if (!valid) throw new Error('Unsupported breakdown manifest');
    void pruneStaticJsonCache('breakdowns', manifest.version);
    return manifest;
  }).catch((error) => {
    manifestPromise = null;
    throw error;
  });

  return manifestPromise;
}

function isValidPack(
  pack: BreakdownPack,
  manifestShard: BreakdownManifestShard,
  shardCount: number,
): boolean {
  if (pack.schemaVersion !== 1 || pack.shard !== manifestShard.shard) return false;
  if (!Array.isArray(pack.items) || pack.count !== pack.items.length) return false;
  if (pack.count !== manifestShard.count) return false;

  return pack.items.every((item) => (
    item
    && typeof item.character === 'string'
    && getShard(item.character, shardCount) === pack.shard
  ));
}

async function loadShard(
  shard: number,
  manifest: BreakdownManifest,
): Promise<Map<string, DBCharacterBreakdown> | null> {
  const cached = shardCache.get(shard);
  if (cached) return cached;

  const pending = pendingShards.get(shard);
  if (pending) return pending;

  const request = (async () => {
    try {
      const manifestShard = manifest.shards.find((item) => item.shard === shard);
      if (!manifestShard || !manifestShard.path.startsWith('/data/breakdowns/')) return null;

      const persistentKey = `breakdowns:${manifest.version}:shard:${shard}`;
      const pack = await fetchStaticJson<BreakdownPack>(
        manifestShard.path,
        `breakdown shard ${shard}`,
        { persistentKey },
      );
      if (!isValidPack(pack, manifestShard, manifest.shardCount)) {
        await removeStaticJsonCache(persistentKey);
        throw new Error(`Breakdown shard ${shard} failed validation`);
      }

      const indexed = new Map(pack.items.map((item) => [item.character, item]));
      shardCache.set(shard, indexed);
      return indexed;
    } finally {
      pendingShards.delete(shard);
    }
  })();

  pendingShards.set(shard, request);
  return request;
}

export async function fetchBreakdownsFromPacks(
  characters: string[],
): Promise<Record<string, DBCharacterBreakdown>> {
  const results: Record<string, DBCharacterBreakdown> = {};

  try {
    const manifest = await getManifest();
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
      const indexed = await loadShard(shard, manifest);
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
