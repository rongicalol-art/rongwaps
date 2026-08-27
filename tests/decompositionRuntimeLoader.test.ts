import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RuntimePackLoader,
  RuntimePackSafetyError,
  type RuntimePackManifest,
  type RuntimePackRecord,
  type RuntimePackTransport,
} from '../src/features/character-decomposition/runtimeLoader';
import {
  allowsDevelopmentCandidatePack,
  getDecompositionRuntimeMode,
} from '../src/features/character-decomposition/runtimeMode';
import {
  compareDecompositionRuntimes,
  createDecompositionRuntimeService,
} from '../src/features/character-decomposition/decompositionService';
import type { DBCharacterBreakdown } from '../src/types/database';

function shardFor(value: string, count: number) {
  return (value.codePointAt(0) ?? 0) % count;
}

function componentShard(value: string, count: number) {
  return shardFor(value.replace(/^[^:]+:/u, ''), count);
}

function descriptor(path: string, shard: number, count: number, bytes = 1) {
  return { shard, count, path, bytes, sha256: `${path}-hash`, gzipBytes: bytes, brotliBytes: bytes };
}

function makeFixture() {
  const recordMap: Record<string, RuntimePackRecord> = {
    '學': { r: '学-record', s: 0, t: ['s', '⿱', [['g', '𦥯'], ['g', '子']]] },
    '𦥯': { r: '𦥯-record', s: 0, t: ['s', '⿶', [['s', '⿱', [['g', '𦥑'], ['g', '冖']]], ['g', '爻']]] },
    '子': { r: '子-record', s: 0, t: ['g', '子'] },
    '不': { r: '不-record', s: 0, t: ['s', '⿱', [['g', '一'], ['u', 'cjkvi:unencoded:3-stroke', 3]]] },
    '万': { r: '万-record', s: 0, t: ['s', '⿱', [['g', '一'], ['s', '⿰', [['g', '丿'], ['g', '𠃌']]]]] },
    '嚐': { r: '嚐-record', s: 0, t: ['s', '⿰', [['g', '口'], ['g', '嘗']]] },
    '溼': { r: '溼-record', s: 0, t: ['s', '⿰', [['g', '氵'], ['g', '𡌥']]] },
    '汙': { r: '汙-record', s: 0, t: ['s', '⿰', [['g', '氵'], ['g', '于']]] },
    '冠': { r: '冠-record', s: 0, t: ['s', '⿱', [['g', '冖'], ['g', '㝴']]] },
    '疑': { r: '疑-record', s: 0, t: ['s', '⿰', [['g', '匕'], ['?']]] },
    'A': { r: 'A-record', s: 0, t: ['s', '⿰', [['g', 'B'], ['g', '一']]] },
    'B': { r: 'B-record', s: 0, t: ['s', '⿰', [['g', 'A'], ['g', '一']]] },
    '一': { r: '一-record', s: 0, t: ['g', '一'] },
  };
  const recordShards: Array<Record<string, RuntimePackRecord>> = [{}, {}];
  for (const [character, record] of Object.entries(recordMap)) recordShards[shardFor(character, 2)][character] = record;
  const direct: Record<string, string[]> = {
    '學': ['g:𦥯', 'g:子'],
    '𦥯': ['g:𦥑', 'g:冖', 'g:爻'],
    '不': ['g:一', 'u:cjkvi:unencoded:3-stroke'],
    '万': ['g:一', 'g:丿', 'g:𠃌'],
    '嚐': ['g:口', 'g:嘗'],
    '溼': ['g:氵', 'g:𡌥'],
    '汙': ['g:氵', 'g:于'],
    '冠': ['g:冖', 'g:㝴'],
    '疑': ['g:匕', '?'],
    A: ['g:B', 'g:一'],
    B: ['g:A', 'g:一'],
  };
  const reverse: Record<string, string[]> = {};
  for (const [parent, components] of Object.entries(direct)) {
    for (const component of components) reverse[component] = [...(reverse[component] ?? []), parent];
  }
  const directShards: Array<Record<string, string[]>> = [{}, {}];
  for (const [character, components] of Object.entries(direct)) directShards[shardFor(character, 2)][character] = components;
  const reverseShards: Array<Record<string, string[]>> = [{}, {}];
  for (const [component, parents] of Object.entries(reverse)) reverseShards[componentShard(component, 2)][component] = parents.sort();
  const pack = (kind: string, shard: number, value: object, count: number) => ({ schemaVersion: 1, shard, count, [kind]: value });
  const files = new Map<string, unknown>();
  recordShards.forEach((value, shard) => files.set(`/pack/records/shard-${String(shard).padStart(2, '0')}.json`, pack('records', shard, value, Object.keys(value).length)));
  directShards.forEach((value, shard) => files.set(`/pack/indexes/direct/shard-${String(shard).padStart(2, '0')}.json`, pack('direct', shard, value, Object.keys(value).length)));
  reverseShards.forEach((value, shard) => files.set(`/pack/indexes/reverse/shard-${String(shard).padStart(2, '0')}.json`, pack('reverse', shard, value, Object.keys(value).length)));
  const recordDescriptors = recordShards.map((value, shard) => descriptor(`records/shard-${String(shard).padStart(2, '0')}.json`, shard, Object.keys(value).length));
  const directDescriptors = directShards.map((value, shard) => descriptor(`indexes/direct/shard-${String(shard).padStart(2, '0')}.json`, shard, Object.keys(value).length));
  const reverseDescriptors = reverseShards.map((value, shard) => descriptor(`indexes/reverse/shard-${String(shard).padStart(2, '0')}.json`, shard, Object.keys(value).length));
  const manifest: RuntimePackManifest = {
    schemaVersion: 1,
    generatorVersion: 'fixture',
    version: 'fixture-v1',
    releaseId: 'release',
    releaseKey: 'fixture',
    locale: 'zh-Hant-TW',
    policyVersion: 'fixture',
    distribution: 'development-only-candidate',
    publishable: false,
    licenseGate: { status: 'blocked', publishable: false, openBlockers: ['fixture'], note: 'fixture' },
    sourceProjectionCount: Object.keys(recordMap).length,
    selection: { mode: 'fixture', seedCharacterCount: 1 },
    recordCount: Object.keys(recordMap).length,
    sources: [{ id: 'cjkvi-ids', version: 'fixture', checksum: 'fixture', redistributionStatus: 'blocked', license: 'fixture', attribution: 'fixture' }],
    courseCoverage: {
      traditional: { total: 1, found: 1, missing: [] },
      simplified: { total: 1, found: 1, missing: [] },
    },
    recordShards: recordDescriptors,
    indexes: {
      direct: { strategy: 'unicode-code-point-modulo', shardCount: 2, shards: directDescriptors },
      reverse: { strategy: 'component-code-point-modulo', shardCount: 2, shards: reverseDescriptors },
    },
  };
  files.set('/pack/manifest.json', manifest);
  const calls: string[] = [];
  const prunes: string[] = [];
  const transport: RuntimePackTransport = {
    async fetchJson<T>(path: string) {
      calls.push(path);
      const data = files.get(path);
      if (data === undefined) throw new Error(`fixture missing ${path}`);
      return { data: data as T, source: 'network' as const };
    },
    async prune(namespace, version) { prunes.push(`${namespace}:${version}`); },
  };
  return { manifest, transport, calls, prunes };
}

test('production rejects development-only/non-publishable packs', async () => {
  const fixture = makeFixture();
  const loader = new RuntimePackLoader({ basePath: '/pack', environment: 'production', transport: fixture.transport });
  await assert.rejects(loader.getManifest(), RuntimePackSafetyError);
});

test('feature flag defaults to legacy and requires explicit development candidate opt-in', () => {
  assert.equal(getDecompositionRuntimeMode({ DEV: true }), 'legacy');
  assert.equal(getDecompositionRuntimeMode({ DEV: true, VITE_DECOMPOSITION_RUNTIME: 'v3' }), 'v3');
  assert.equal(getDecompositionRuntimeMode({ PROD: true, VITE_DECOMPOSITION_RUNTIME: 'v3' }), 'legacy');
  assert.equal(allowsDevelopmentCandidatePack({ DEV: true, VITE_DECOMPOSITION_RUNTIME: 'v3' }), false);
  assert.equal(allowsDevelopmentCandidatePack({ DEV: true, VITE_DECOMPOSITION_RUNTIME: 'v3', VITE_DECOMPOSITION_RUNTIME_ALLOW_CANDIDATE: 'true' }), true);
  const service = createDecompositionRuntimeService({
    environment: { DEV: true, VITE_DECOMPOSITION_RUNTIME: 'v3' },
    legacyLookup: async () => null,
  });
  assert.equal(service.runtime, 'legacy');
});

test('lazy lookup loads only needed shards, marks 學 → 𦥯 expandable, and caches warm reads', async () => {
  const fixture = makeFixture();
  const loader = new RuntimePackLoader({ basePath: '/pack', environment: 'test', allowDevelopmentCandidate: true, transport: fixture.transport });
  const children = await loader.getDirectVisibleChildren('學');
  assert.deepEqual(children.children.map((child) => [child.key, child.expansion]), [
    ['g:𦥯', 'expandable'],
    ['g:子', 'leaf'],
  ]);
  const firstFetchCount = fixture.calls.length;
  await loader.getRecord('學');
  assert.equal(fixture.calls.length, firstFetchCount);
  assert(loader.getMetrics().inMemoryHits > 0);
  assert(loader.getMetrics().networkFiles < 6, 'lookup must not download the full 193-file candidate pack');
  assert.equal(fixture.prunes[0], 'decomposition-runtime:1:fixture-v1');
});

test('direct/reverse indexes and structure projections preserve semantics', async () => {
  const fixture = makeFixture();
  const loader = new RuntimePackLoader({ basePath: '/pack', environment: 'test', allowDevelopmentCandidate: true, transport: fixture.transport });
  const service = createDecompositionRuntimeService({ mode: 'v3', v3Loader: loader });
  assert.deepEqual((await loader.getDirectComponentKeys('學')).componentKeys, ['g:𦥯', 'g:子']);
  assert.deepEqual((await loader.getParents('g:𦥯')).parents, ['學']);
  assert.deepEqual((await service.getParents('g:𦥯')).parents, ['學']);
  assert.deepEqual((await loader.getDirectVisibleChildren('万')).children.map((child) => child.key), ['g:一', 'g:丿', 'g:𠃌']);
  assert.deepEqual((await loader.getDirectVisibleChildren('學')).children.map((child) => child.layoutPath), [['⿱'], ['⿱']]);
  assert.deepEqual((await loader.getDirectVisibleChildren('𦥯')).children.map((child) => child.layoutPath), [['⿶', '⿱@0'], ['⿶', '⿱@0'], ['⿶']]);
  assert.deepEqual((await loader.getDirectVisibleChildren('不')).children.map((child) => [child.key, child.label]), [
    ['g:一', undefined],
    ['u:cjkvi:unencoded:3-stroke', 'No glyph'],
  ]);
  assert.equal((await loader.getDirectVisibleChildren('不')).children[1].strokeCount, 3);
  assert.equal((await loader.getDirectVisibleChildren('疑')).children[1].label, 'Unknown component');
});

test('representative course characters resolve through the same service', async () => {
  const fixture = makeFixture();
  const loader = new RuntimePackLoader({ basePath: '/pack', environment: 'test', allowDevelopmentCandidate: true, transport: fixture.transport });
  const service = createDecompositionRuntimeService({ mode: 'v3', v3Loader: loader });
  const expected: Record<string, string[]> = {
    '學': ['g:𦥯', 'g:子'],
    '𦥯': ['g:𦥑', 'g:冖', 'g:爻'],
    '嚐': ['g:口', 'g:嘗'],
    '溼': ['g:氵', 'g:𡌥'],
    '汙': ['g:氵', 'g:于'],
    '不': ['g:一', 'u:cjkvi:unencoded:3-stroke'],
    '万': ['g:一', 'g:丿', 'g:𠃌'],
    '冠': ['g:冖', 'g:㝴'],
  };
  for (const [character, components] of Object.entries(expected)) {
    const result = await service.getDirectComponentKeys(character);
    assert.equal(result.status, 'found', character);
    assert.deepEqual(result.componentKeys, components, character);
  }
});

test('missing, leaf, cycles, and maximum depth are explicit states', async () => {
  const fixture = makeFixture();
  const loader = new RuntimePackLoader({ basePath: '/pack', environment: 'test', allowDevelopmentCandidate: true, transport: fixture.transport });
  assert.equal((await loader.getRecord('missing')).status, 'missing');
  assert.equal((await loader.getDirectVisibleChildren('一')).status, 'leaf');
  assert.equal((await loader.expand('A', { ancestry: ['A'] })).status, 'cycle');
  assert.equal((await loader.expand('A', { maxDepth: 0 })).status, 'max-depth');
  const expanded = await loader.expand('A', { maxDepth: 5 });
  assert.equal(expanded.status, 'found');
});

test('manifest version/schema changes trigger persistent-cache namespace invalidation', async () => {
  const fixture = makeFixture();
  const loader = new RuntimePackLoader({ basePath: '/pack', environment: 'test', allowDevelopmentCandidate: true, transport: fixture.transport });
  await loader.getManifest();
  assert.deepEqual(fixture.prunes, ['decomposition-runtime:1:fixture-v1']);
  const invalid = makeFixture();
  invalid.manifest.schemaVersion = 2;
  invalid.manifest.version = 'fixture-v2';
  invalid.transport = {
    ...invalid.transport,
    fetchJson: async <T>(path: string) => ({ data: (path.endsWith('manifest.json') ? invalid.manifest : {}) as T, source: 'network' as const }),
  };
  const invalidLoader = new RuntimePackLoader({ basePath: '/pack', environment: 'test', allowDevelopmentCandidate: true, transport: invalid.transport });
  await assert.rejects(invalidLoader.getManifest(), RuntimePackSafetyError);
});

test('persistent shard reads stay in the shared versioned cache namespace', async () => {
  const fixture = makeFixture();
  const keys: string[] = [];
  const transport: RuntimePackTransport = {
    async fetchJson<T>(path, label, persistentKey) {
      keys.push(persistentKey);
      const result = await fixture.transport.fetchJson<T>(path, label, persistentKey);
      return { data: result.data, source: path.endsWith('manifest.json') ? 'network' : 'persistent-cache' };
    },
    prune: fixture.transport.prune,
  };
  const loader = new RuntimePackLoader({ basePath: '/pack', environment: 'test', allowDevelopmentCandidate: true, transport });
  await loader.getRecord('學');
  assert.equal(loader.getMetrics().persistentCacheFiles, 1);
  assert.equal(keys[0], '');
  assert.match(keys[1], /^decomposition-runtime:1:fixture-v1:record:/u);
});

test('dual-read comparison reports source differences without rewriting either result', async () => {
  const fixture = makeFixture();
  const loader = new RuntimePackLoader({ basePath: '/pack', environment: 'test', allowDevelopmentCandidate: true, transport: fixture.transport });
  const legacy: DBCharacterBreakdown = {
    character: '學', radical: null, pinyin: null, definition: null, decomposition: '⿱⿰臼爻子', components_historical: null,
  };
  const comparison = await compareDecompositionRuntimes('學', {
    v3Loader: loader,
    legacyLookup: async () => legacy,
  });
  assert.equal(comparison.character, '學');
  assert.equal(comparison.v3DirectComponents[0], 'g:𦥯');
  assert.equal(comparison.different, true);
  const service = createDecompositionRuntimeService({ mode: 'v3', v3Loader: loader });
  assert.equal((await service.getRecord('學')).runtime, 'v3');
});
