import assert from 'node:assert/strict';
import test from 'node:test';
import { createPackLoader } from '../src/services/packLoader';

interface TestManifest {
  schemaVersion: number;
  version: string;
  parts: { key: number; count: number; path: string }[];
}

interface TestPack {
  schemaVersion: number;
  key: number;
  count: number;
  items: string[];
}

type FetchCall = { url: string; init?: RequestInit };

function createFetchStub(responses: Map<string, () => unknown>): { calls: FetchCall[]; fetch: typeof fetch } {
  const calls: FetchCall[] = [];
  const fetchStub = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const produce = responses.get(url);
    if (!produce) {
      throw new Error(`Unexpected fetch: ${url}`);
    }
    return new Response(JSON.stringify(produce()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  return { calls, fetch: fetchStub };
}

const validManifest: TestManifest = {
  schemaVersion: 1,
  version: 'v1',
  parts: [
    { key: 1, count: 2, path: '/data/test/part-1.json' },
    { key: 2, count: 1, path: '/data/test/part-2.json' },
  ],
};

const packBody = (key: number, count: number) => () => ({
  schemaVersion: 1,
  key,
  count,
  items: [`item-${key}-a`, `item-${key}-b`].slice(0, count),
});

function createTestLoader(overrides: Partial<Parameters<typeof createPackLoader<TestManifest, TestPack, string[]>>[0]> = {}) {
  return createPackLoader<TestManifest, TestPack, string[]>({
    namespace: 'test',
    manifestPath: '/data/test/manifest.json',
    manifestLabel: 'test manifest',
    partPathPrefix: '/data/test/',
    partCacheKeyKind: 'shard',
    partLabel: (key) => `test part ${key}`,
    validateManifest: (manifest) => manifest.schemaVersion === 1 && manifest.parts.length > 0,
    getParts: (manifest) => manifest.parts.map((part) => ({
      key: part.key,
      path: part.path,
      count: part.count,
    })),
    validatePack: (pack, part) => (
      pack.schemaVersion === 1
      && pack.key === part.key
      && pack.count === pack.items.length
      && pack.count === part.count
    ),
    transform: (pack) => pack.items,
    ...overrides,
  });
}

function withFetch(stub: typeof fetch, run: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = stub;
  return run().finally(() => {
    globalThis.fetch = original;
  });
}

test('pack loader caches the manifest and dedupes concurrent part requests', async () => {
  const { calls, fetch } = createFetchStub(new Map<string, () => unknown>([
    ['/data/test/manifest.json', () => validManifest],
    ['/data/test/part-1.json', packBody(1, 2)],
    ['/data/test/part-2.json', packBody(2, 1)],
  ]));

  await withFetch(fetch, async () => {
    const loader = createTestLoader();

    const [first, second, third] = await Promise.all([
      loader.loadPart(1),
      loader.loadPart(1),
      loader.loadPart(2),
    ]);

    assert.deepEqual(first, ['item-1-a', 'item-1-b']);
    assert.deepEqual(second, ['item-1-a', 'item-1-b']);
    assert.deepEqual(third, ['item-2-a']);

    // One manifest fetch; each part fetched exactly once despite the
    // concurrent duplicate request for part 1.
    assert.equal(calls.filter((call) => call.url.endsWith('manifest.json')).length, 1);
    assert.equal(calls.filter((call) => call.url.endsWith('part-1.json')).length, 1);
    assert.equal(calls.filter((call) => call.url.endsWith('part-2.json')).length, 1);

    // Subsequent loads hit the memory cache with zero new fetches.
    await loader.loadPart(1);
    assert.equal(calls.filter((call) => call.url.endsWith('part-1.json')).length, 1);
  });
});

test('pack loader rejects an invalid pack and allows retry after the fetch recovers', async () => {
  const badPack = () => ({ schemaVersion: 1, key: 1, count: 1, items: ['a', 'b'] });
  const goodPack = packBody(1, 2);
  let failNext = true;
  const { calls, fetch } = createFetchStub(new Map<string, () => unknown>([
    ['/data/test/manifest.json', () => validManifest],
    ['/data/test/part-1.json', () => (failNext ? badPack() : goodPack())],
  ]));

  await withFetch(fetch, async () => {
    const loader = createTestLoader();

    await assert.rejects(() => loader.loadPart(1), /failed validation/);

    failNext = false;
    const recovered = await loader.loadPart(1);
    assert.deepEqual(recovered, ['item-1-a', 'item-1-b']);
    assert.equal(calls.filter((call) => call.url.endsWith('part-1.json')).length, 2);
  });
});

test('pack loader resolves null for unknown keys and paths outside the prefix', async () => {
  const { calls, fetch } = createFetchStub(new Map<string, () => unknown>([
    ['/data/test/manifest.json', () => validManifest],
  ]));

  await withFetch(fetch, async () => {
    const loader = createTestLoader();
    assert.equal(await loader.loadPart(99), null);

    const tampered: TestManifest = {
      ...validManifest,
      parts: [{ key: 7, count: 1, path: 'https://evil.example/part-7.json' }],
    };
    const loader2 = createTestLoader();
    const tamperedFetch = createFetchStub(new Map<string, () => unknown>([
      ['/data/test/manifest.json', () => tampered],
    ]));
    await withFetch(tamperedFetch.fetch, async () => {
      assert.equal(await loader2.loadPart(7), null);
      assert.ok(!calls.some((call) => call.url.includes('evil')));
    });
  });
});

test('pack loader resets the manifest promise on failure so a later call can retry', async () => {
  let failManifest = true;
  const { calls, fetch } = createFetchStub(new Map<string, () => unknown>([
    ['/data/test/manifest.json', () => {
      if (failManifest) throw new Error('network down');
      return validManifest;
    }],
    ['/data/test/part-1.json', packBody(1, 2)],
  ]));

  await withFetch(fetch, async () => {
    const loader = createTestLoader();

    await assert.rejects(() => loader.loadPart(1), /network down/);
    assert.equal(calls.filter((call) => call.url.endsWith('manifest.json')).length, 1);

    failManifest = false;
    const part = await loader.loadPart(1);
    assert.deepEqual(part, ['item-1-a', 'item-1-b']);
    assert.equal(calls.filter((call) => call.url.endsWith('manifest.json')).length, 2);
  });
});

test('pack loader loadAllParts returns every defined part sorted by key', async () => {
  const { calls, fetch } = createFetchStub(new Map<string, () => unknown>([
    ['/data/test/manifest.json', () => validManifest],
    ['/data/test/part-1.json', packBody(1, 2)],
    ['/data/test/part-2.json', packBody(2, 1)],
  ]));

  await withFetch(fetch, async () => {
    const loader = createTestLoader();
    const all = await loader.loadAllParts();
    assert.deepEqual(all, [['item-1-a', 'item-1-b'], ['item-2-a']]);
    assert.equal(calls.filter((call) => call.url.includes('part-')).length, 2);
  });
});

test('pack loader rejects when the manifest fails feature validation', async () => {
  const { fetch } = createFetchStub(new Map<string, () => unknown>([
    ['/data/test/manifest.json', () => ({ ...validManifest, schemaVersion: 99 })],
  ]));

  await withFetch(fetch, async () => {
    const loader = createTestLoader();
    await assert.rejects(() => loader.loadPart(1), /Unsupported test manifest/);
  });
});
