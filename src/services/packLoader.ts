import { fetchStaticJson, pruneStaticJsonCache, removeStaticJsonCache } from './staticContentService';

/**
 * Shared pack-loading mechanism for the pack-first content strategy.
 *
 * Owns HOW packs load: manifest lifecycle, persistent IndexedDB cache keys,
 * in-memory part cache, request deduplication, and validation-failure cache
 * eviction.
 *
 * Feature services own WHAT a pack contains: manifest/pack shapes, manifest
 * and item validation, and the fallback policy (this loader throws; callers
 * that degrade to database fallbacks wrap calls in their own catch).
 */

export interface PackPart {
  /** Stable key used for caching and lookups (shard number or book id). */
  key: number;
  path: string;
  count: number;
}

export interface PackLoader<TManifest, TLoaded> {
  manifest: () => Promise<TManifest>;
  /**
   * Loads one part. Resolves null only when the manifest does not define the
   * key or its path is outside `partPathPrefix`; every other failure throws.
   * Successful parts are cached in memory; concurrent requests share one
   * fetch. A pack that fails validation has its persistent cache evicted.
   */
  loadPart: (key: number) => Promise<TLoaded | null>;
  loadAllParts: () => Promise<TLoaded[]>;
}

export interface PackLoaderOptions<TManifest, TPack, TLoaded> {
  /** Namespace used for persistent cache keys and stale-version pruning. */
  namespace: string;
  manifestPath: string;
  manifestLabel: string;
  /** Feature-owned manifest schema gate. Return false to reject. */
  validateManifest: (manifest: TManifest) => boolean;
  /** Maps a validated manifest to its loadable parts. */
  getParts: (manifest: TManifest) => PackPart[];
  /** Parts must live under this path prefix (guards against manifest tampering). */
  partPathPrefix: string;
  /** Segment used inside the persistent cache key, e.g. 'shard' or 'book'. */
  partCacheKeyKind: string;
  /** Feature-owned pack validation. Return false to reject (cache evicted). */
  validatePack: (pack: TPack, part: PackPart, manifest: TManifest) => boolean;
  /** Optional post-validation mapping (e.g. index items by key). */
  transform?: (pack: TPack) => TLoaded;
  partLabel: (key: number) => string;
}

export function createPackLoader<TManifest, TPack, TLoaded>(
  options: PackLoaderOptions<TManifest, TPack, TLoaded>,
): PackLoader<TManifest, TLoaded> {
  const {
    namespace,
    manifestPath,
    manifestLabel,
    validateManifest,
    getParts,
    partPathPrefix,
    partCacheKeyKind,
    validatePack,
    transform = (pack) => pack as unknown as TLoaded,
    partLabel,
  } = options;

  let manifestPromise: Promise<TManifest> | null = null;
  const partCache = new Map<number, TLoaded>();
  const pendingParts = new Map<number, Promise<TLoaded | null>>();

  async function getManifest(): Promise<TManifest> {
    if (manifestPromise) return manifestPromise;

    manifestPromise = fetchStaticJson<TManifest>(
      manifestPath,
      manifestLabel,
      { revalidate: true },
    ).then((manifest) => {
      if (!validateManifest(manifest)) {
        throw new Error(`Unsupported ${namespace} manifest`);
      }
      void pruneStaticJsonCache(namespace, (manifest as { version: string }).version);
      return manifest;
    }).catch((error) => {
      manifestPromise = null;
      throw error;
    });

    return manifestPromise;
  }

  async function loadPartUncached(key: number): Promise<TLoaded | null> {
    const manifest = await getManifest();
    const part = getParts(manifest).find((candidate) => candidate.key === key);
    if (!part || !part.path.startsWith(partPathPrefix)) return null;

    const persistentKey = `${namespace}:${(manifest as { version: string }).version}:${partCacheKeyKind}:${key}`;
    const pack = await fetchStaticJson<TPack>(part.path, partLabel(key), { persistentKey });
    if (!validatePack(pack, part, manifest)) {
      await removeStaticJsonCache(persistentKey);
      throw new Error(`${partLabel(key)} failed validation`);
    }

    const loaded = transform(pack);
    partCache.set(key, loaded);
    return loaded;
  }

  function loadPart(key: number): Promise<TLoaded | null> {
    const cached = partCache.get(key);
    if (cached) return Promise.resolve(cached);

    const pending = pendingParts.get(key);
    if (pending) return pending;

    const request = loadPartUncached(key).finally(() => {
      pendingParts.delete(key);
    });
    pendingParts.set(key, request);
    return request;
  }

  return {
    manifest: getManifest,
    loadPart,
    loadAllParts: async () => {
      const manifest = await getManifest();
      const parts = getParts(manifest).slice().sort((a, b) => a.key - b.key);
      const loaded = await Promise.all(parts.map((part) => loadPart(part.key)));
      return loaded.filter((part): part is Awaited<TLoaded> => part !== null);
    },
  };
}
