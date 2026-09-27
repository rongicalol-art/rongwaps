/**
 * Shared pack-first resolver: cache lookup -> in-flight promise dedupe ->
 * pack attempt -> DB fallback -> cache populate.
 */

const inFlightLookups = new Map<string, Promise<unknown>>();

export interface PackFirstLookupOptions<T> {
  dedupeKey: string;
  fromPack: () => Promise<T | null | undefined>;
  fromDb: () => Promise<T>;
  cache?: {
    get: (key: string) => T | undefined;
    set: (key: string, value: T) => void;
  };
}

export function withPackFirstLookup<T>(options: PackFirstLookupOptions<T>): Promise<T> {
  const { dedupeKey, fromPack, fromDb, cache } = options;

  if (cache) {
    const cached = cache.get(dedupeKey);
    if (cached !== undefined) {
      return Promise.resolve(cached);
    }
  }

  const existing = inFlightLookups.get(dedupeKey);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = (async () => {
    try {
      const packResult = await fromPack();
      if (packResult !== null && packResult !== undefined) {
        if (cache) {
          cache.set(dedupeKey, packResult);
        }
        return packResult;
      }

      const dbResult = await fromDb();
      if (cache && dbResult !== null && dbResult !== undefined) {
        cache.set(dedupeKey, dbResult);
      }
      return dbResult;
    } finally {
      inFlightLookups.delete(dedupeKey);
    }
  })();

  inFlightLookups.set(dedupeKey, promise);
  return promise;
}
