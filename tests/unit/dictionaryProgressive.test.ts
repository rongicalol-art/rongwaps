import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { searchDictionary } from '../../src/services/dictionarySearchService';
import { lookupDictionaryApi } from '../../src/services/dictionaryApi';
import { executeRemoteSearch } from '../../src/services/dictionaryService';

test('global search downloads a small result page and exposes failures for retry', async t => {
  const paths: string[] = [];
  let failed = true;
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
    paths.push(String(input));
    return failed ? Response.json({}, { status: 503 }) : Response.json([{ id: 1, traditional: '老師' }]);
  });
  await assert.rejects(executeRemoteSearch('teacher-fixture-retry'));
  failed = false;
  assert.equal((await executeRemoteSearch('teacher-fixture-retry')).length, 1);
  assert.equal((await executeRemoteSearch('teacher-fixture-retry')).length, 1);
  assert.equal(paths.length, 2, 'failed results are retried, successful results are cached');
  assert.ok(paths.every(path => path.startsWith('/api/dictionary/search?')));
  assert.deepEqual(await searchDictionary(''), []);
});

test('exact lookup batches only requested words and stops after cancellation', async t => {
  const controller = new AbortController();
  const batches: string[][] = [];
  t.mock.method(globalThis, 'fetch', async (_input: RequestInfo | URL, init?: RequestInit) => {
    const { words } = JSON.parse(String(init?.body)) as { words: string[] };
    batches.push(words);
    controller.abort();
    return Response.json({});
  });
  await assert.rejects(lookupDictionaryApi(Array.from({ length: 130 }, (_, id) => `fixture-${id}`), controller.signal), { name: 'AbortError' });
  assert.equal(batches.length, 1);
  assert.equal(batches[0].length, 64);
});


test('a failed warm dictionary lookup cannot block the global search', async () => {
  const bundle = await build({ entryPoints: ['src/services/dictionarySearchService.ts'], bundle: true, platform: 'node', format: 'esm', write: false,
    plugins: [{ name: 'failed-warm-lookup', setup(plugin) {
      plugin.onResolve({ filter: /contentPacks$|dictionaryApi$/ }, args => ({ path: args.path, namespace: 'fixture' }));
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path.endsWith('contentPacks')
        ? "export const getLoadedStudyCards=()=>[{front:'老師'}]; export const fetchDictionaryRowsFromPacks=async()=>{throw new Error('warm lookup unavailable');};"
        : "export const searchDictionaryApi=async query=>[{id:1,traditional:query}];" }));
    } }],
  });
  const service = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`) as typeof import('../../src/services/dictionarySearchService');
  const partial: unknown[][] = [];
  assert.equal((await service.searchDictionary('老師', 30, rows => partial.push(rows)))[0].traditional, '老師');
  assert.deepEqual(partial, []);
});
