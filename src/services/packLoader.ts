import { PackMissError } from './errors';
import { fetchStaticJson } from './staticContentService';

class PackValidationError extends Error { override name = 'PackValidationError'; }

/**
 * Shared pack-loading mechanism for the pack-first content strategy.
 *
 * Owns HOW packs load: manifest lifecycle, in-memory part cache, request
 * deduplication, and one retry past the browser's saved copy when a part
 * fails validation.
 *
 * Feature services own WHAT a pack contains: manifest/pack shapes, manifest
 * and item validation, and the fallback policy (this loader throws; callers
 * that degrade to database fallbacks wrap calls in their own catch).
 */

/** `shard.json?v=<hash>`: content-addressed, so the server can send it as immutable. */
export const versionedPath = (path: string, sha256?: string) =>
  !sha256 || path.includes(sha256.slice(0, 12)) ? path : `${path}?v=${sha256.slice(0, 16)}`;

export interface PackPart {
  /** Stable key used for caching and lookups (shard number or book id). */
  key: number;
  path: string;
  count: number;
  /** Content hash from the manifest; versions the URL so browsers can cache it forever. */
  sha256?: string;
}

export interface PackLoader<TManifest, TLoaded> {
  manifest: () => Promise<TManifest>;
  loadedParts: () => Iterable<TLoaded>;
  /**
   * Loads one part. Resolves null only when the manifest does not define the
   * key or its path is outside `partPathPrefix`; every other failure throws.
   * Successful parts are cached in memory; concurrent requests share one
   * fetch.
   */
  loadPart: (key: number) => Promise<TLoaded | null>;
  loadAllParts: () => Promise<TLoaded[]>;
  /** Keep a working set resident while a study session uses it. */
  retainParts: (keys: readonly number[]) => () => void;
}

export interface PackLoaderOptions<TManifest, TPack, TLoaded> {
  /** Short name of the pack, used in error messages. */
  namespace: string;
  manifestPath: string;
  manifestLabel: string;
  /** Feature-owned manifest schema gate. Return false to reject. */
  validateManifest: (manifest: TManifest) => boolean;
  /** Maps a validated manifest to its loadable parts. */
  getParts: (manifest: TManifest) => PackPart[];
  /** Parts must live under this path prefix (guards against manifest tampering). */
  partPathPrefix: string;
  /** Feature-owned pack validation. Return false to reject. */
  validatePack: (pack: TPack, part: PackPart, manifest: TManifest) => boolean;
  /** Optional post-validation mapping (e.g. index items by key). */
  transform?: (pack: TPack) => TLoaded;
  partLabel: (key: number) => string;
  /** Limit decoded resident shards for large, individually requested datasets. */
  maxCachedParts?: number;
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
    validatePack,
    transform = (pack) => pack as unknown as TLoaded,
    partLabel,
  } = options;

  let manifestPromise: Promise<TManifest> | null = null;
  const partCache = new Map<number, TLoaded>();
  const pendingParts = new Map<number, Promise<TLoaded | null>>();
  const retained = new Map<number, number>();

  function pruneParts() {
    for (const key of partCache.keys()) {
      if (partCache.size <= Math.max(1, options.maxCachedParts ?? Infinity)) break;
      if (!retained.has(key)) partCache.delete(key);
    }
  }

  /** `fromServer`: skip the browser's saved copy (the listed files changed under us). */
  async function getManifest(fromServer = false): Promise<TManifest> {
    if (manifestPromise) return manifestPromise;

    manifestPromise = fetchStaticJson<TManifest>(
      manifestPath,
      manifestLabel,
      { revalidate: true, serverOnly: fromServer },
    ).then((manifest) => {
      if (!validateManifest(manifest)) {
        throw new Error(`Unsupported ${namespace} manifest`);
      }
      return manifest;
    }).catch((error) => {
      manifestPromise = null;
      throw error;
    });

    return manifestPromise;
  }

  /**
   * A deploy replaces every pack, so a tab holding the previous manifest asks for
   * files that are gone (404) or changed (validation). Refetch the manifest once.
   */
  async function loadPartUncached(key: number): Promise<TLoaded | null> {
    const stale = await getManifest();
    try {
      return await loadPartFrom(stale, key);
    } catch (error) {
      if (!(error instanceof PackMissError || error instanceof PackValidationError)) throw error;
      if (manifestPromise) {
        const current = await manifestPromise.catch(() => null);
        if (current === stale) manifestPromise = null;
      }
      const fresh = await getManifest(true);
      if ((fresh as { version: string }).version === (stale as { version: string }).version) throw error;
      return loadPartFrom(fresh, key);
    }
  }

  async function loadPartFrom(manifest: TManifest, key: number): Promise<TLoaded | null> {
    const part = getParts(manifest).find((candidate) => candidate.key === key);
    if (!part || !part.path.startsWith(partPathPrefix)) return null;

    let pack = await fetchStaticJson<TPack>(versionedPath(part.path, part.sha256), partLabel(key));
    // A versioned address is kept by the browser for a year. If a release switch stored the wrong bytes under
    // it, only a fetch past the saved copy can recover: try that once before giving up.
    if (!validatePack(pack, part, manifest)) {
      pack = await fetchStaticJson<TPack>(versionedPath(part.path, part.sha256), partLabel(key), { reload: true });
    }
    if (!validatePack(pack, part, manifest)) {
      throw new PackValidationError(`${partLabel(key)} failed validation`);
    }

    const loaded = transform(pack);
    partCache.set(key, loaded);
    pruneParts();
    return loaded;
  }

  function loadPart(key: number): Promise<TLoaded | null> {
    const cached = partCache.get(key);
    if (cached) {
      partCache.delete(key);
      partCache.set(key, cached);
      return Promise.resolve(cached);
    }

    const pending = pendingParts.get(key);
    if (pending) return pending;

    const request = loadPartUncached(key).finally(() => {
      pendingParts.delete(key);
    });
    pendingParts.set(key, request);
    return request;
  }

  return {
    manifest: () => getManifest(),
    loadedParts: () => partCache.values(),
    loadPart,
    retainParts: (keys) => {
      const unique = [...new Set(keys)];
      for (const key of unique) retained.set(key, (retained.get(key) ?? 0) + 1);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        for (const key of unique) {
          const count = (retained.get(key) ?? 1) - 1;
          if (count) retained.set(key, count); else retained.delete(key);
        }
        pruneParts();
      };
    },
    loadAllParts: async () => {
      const manifest = await getManifest();
      const parts = getParts(manifest).slice().sort((a, b) => a.key - b.key);
      const loaded = await Promise.all(parts.map((part) => loadPart(part.key)));
      return loaded.filter((part): part is Awaited<TLoaded> => part !== null);
    },
  };
}
