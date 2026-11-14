import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { searchDictionary } from '../../src/services/dictionarySearchService';
import { executeRemoteSearch } from '../../src/services/dictionaryService';

test('a failed search is retried, a successful one is remembered', async t => {
  const paths: string[] = [];
  let failed = true;
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
    const path = String(input);
    paths.push(path);
    assert.ok(path.startsWith('/data/'), 'the dictionary reads content packs; no server answers searches');
    if (failed) return Response.json({}, { status: 503 });
    return Response.json(path.endsWith('dictionary-search-index.json') ? { items: [] }
      : path.endsWith('parts.json') ? { parents: {}, phonetic: {} }
      : path.endsWith('course-lookup.json') ? { cards: [], entries: [], rows: [] } : {});
  });
  await assert.rejects(executeRemoteSearch('teacher-fixture-retry'));
  failed = false;
  assert.deepEqual(await executeRemoteSearch('teacher-fixture-retry'), []);
  const afterSuccess = paths.length;
  assert.deepEqual(await executeRemoteSearch('teacher-fixture-retry'), []);
  assert.equal(paths.length, afterSuccess, 'successful results are cached');
  assert.deepEqual(await searchDictionary(''), []);
});


test('a failed warm dictionary lookup cannot block the global search', async () => {
  const bundle = await build({ entryPoints: ['src/services/dictionarySearchService.ts'], bundle: true, platform: 'node', format: 'esm', write: false,
    plugins: [{ name: 'failed-warm-lookup', setup(plugin) {
      plugin.onResolve({ filter: /contentPacks$|dictionaryApi$|dictionaryCommonSearch$/ }, args => ({ path: args.path, namespace: 'fixture' }));
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path.endsWith('contentPacks')
        ? "export const getLoadedStudyCards=()=>[{front:'老師'}]; export const fetchDictionaryRowsFromPacks=async()=>{throw new Error('warm lookup unavailable');};"
        : args.path.endsWith('dictionaryCommonSearch') ? 'export const searchCommonWords=async()=>[];'
        : "export const searchDictionaryApi=async query=>[{id:1,traditional:query}];" }));
    } }],
  });
  const service = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`) as typeof import('../../src/services/dictionarySearchService');
  const partial: unknown[][] = [];
  assert.equal((await service.searchDictionary('老師', 30, rows => partial.push(rows)))[0].traditional, '老師');
  assert.deepEqual(partial, []);
});

test('common-word results publish before the full answer, never after it', async () => {
  // The fixture lets each case decide when the common words and the full dictionary answer.
  const bundle = await build({ entryPoints: ['src/services/dictionarySearchService.ts'], bundle: true, platform: 'node', format: 'esm', write: false,
    plugins: [{ name: 'timed-sources', setup(plugin) {
      plugin.onResolve({ filter: /contentPacks$|dictionaryApi$|dictionaryCommonSearch$/ }, args => ({ path: args.path, namespace: 'fixture' }));
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path.endsWith('contentPacks')
        ? 'export const getLoadedStudyCards=()=>[]; export const fetchDictionaryRowsFromPacks=async()=>new Map();'
        : args.path.endsWith('dictionaryCommonSearch') ? 'export const searchCommonWords=(...args)=>globalThis.__device(...args);'
        : 'export const searchDictionaryApi=(...args)=>globalThis.__server(...args);' }));
    } }],
  });
  const service = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`) as typeof import('../../src/services/dictionarySearchService');
  const timed = (ms: number, rows: unknown[]) => () => new Promise(resolve => setTimeout(() => resolve(rows), ms));
  const scope = globalThis as unknown as Record<string, unknown>;

  scope.__device = timed(1, [{ id: 1, traditional: '吃', simplified: '吃' }]);
  scope.__server = timed(20, [{ id: 1, traditional: '吃', simplified: '吃' }, { id: 2, traditional: '喫', simplified: '喫' }]);
  const early: unknown[][] = [];
  assert.equal((await service.searchDictionary('chi', 30, rows => early.push(rows))).length, 2, 'the full answer is final');
  assert.equal(early.length, 1);
  assert.equal(early[0].length, 1);

  scope.__device = timed(20, [{ id: 1, traditional: '吃', simplified: '吃' }]);
  scope.__server = timed(1, [{ id: 2, traditional: '喫', simplified: '喫' }]);
  const late: unknown[][] = [];
  await service.searchDictionary('chi', 30, rows => late.push(rows));
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.deepEqual(late, [], 'a slower common-words result never replaces the full answer');
  delete scope.__device; delete scope.__server;
});
