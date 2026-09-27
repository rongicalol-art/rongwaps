import assert from 'node:assert/strict';
import test from 'node:test';
import { withPackFirstLookup } from '../src/services/packFirstLookup';

test('packFirstLookup: returns cached item directly if present', async () => {
  const store = new Map<string, string>([['key-1', 'cached-value']]);
  const cache = {
    get: (k: string) => store.get(k),
    set: (k: string, v: string) => store.set(k, v),
  };

  let packCalls = 0;
  let dbCalls = 0;

  const result = await withPackFirstLookup({
    dedupeKey: 'key-1',
    fromPack: async () => { packCalls++; return 'pack-value'; },
    fromDb: async () => { dbCalls++; return 'db-value'; },
    cache,
  });

  assert.equal(result, 'cached-value');
  assert.equal(packCalls, 0);
  assert.equal(dbCalls, 0);
});

test('packFirstLookup: uses pack result and populates cache', async () => {
  const store = new Map<string, string>();
  const cache = {
    get: (k: string) => store.get(k),
    set: (k: string, v: string) => store.set(k, v),
  };

  let packCalls = 0;
  let dbCalls = 0;

  const result = await withPackFirstLookup({
    dedupeKey: 'key-2',
    fromPack: async () => { packCalls++; return 'pack-value'; },
    fromDb: async () => { dbCalls++; return 'db-value'; },
    cache,
  });

  assert.equal(result, 'pack-value');
  assert.equal(packCalls, 1);
  assert.equal(dbCalls, 0);
  assert.equal(store.get('key-2'), 'pack-value');
});

test('packFirstLookup: falls back to db if pack returns null', async () => {
  const store = new Map<string, string>();
  const cache = {
    get: (k: string) => store.get(k),
    set: (k: string, v: string) => store.set(k, v),
  };

  let packCalls = 0;
  let dbCalls = 0;

  const result = await withPackFirstLookup({
    dedupeKey: 'key-3',
    fromPack: async () => { packCalls++; return null; },
    fromDb: async () => { dbCalls++; return 'db-value'; },
    cache,
  });

  assert.equal(result, 'db-value');
  assert.equal(packCalls, 1);
  assert.equal(dbCalls, 1);
  assert.equal(store.get('key-3'), 'db-value');
});

test('packFirstLookup: dedupes concurrent requests with same key', async () => {
  let dbCalls = 0;

  const [res1, res2] = await Promise.all([
    withPackFirstLookup({
      dedupeKey: 'key-4',
      fromPack: async () => null,
      fromDb: async () => {
        dbCalls++;
        await new Promise((r) => setTimeout(r, 10));
        return 'shared-db-value';
      },
    }),
    withPackFirstLookup({
      dedupeKey: 'key-4',
      fromPack: async () => null,
      fromDb: async () => {
        dbCalls++;
        return 'shared-db-value';
      },
    }),
  ]);

  assert.equal(res1, 'shared-db-value');
  assert.equal(res2, 'shared-db-value');
  assert.equal(dbCalls, 1);
});
