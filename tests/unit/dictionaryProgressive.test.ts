import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { searchDictionary } from '../../src/services/dictionarySearchService';
import { lookupCourseCardsApi, lookupDictionaryApi } from '../../src/services/dictionaryApi';
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

test('device common-word results publish before the server answer, never after it', async () => {
  // The fixture lets each case decide when the device and the server answer.
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
  assert.equal((await service.searchDictionary('chi', 30, rows => early.push(rows))).length, 2, 'the server answer is final');
  assert.equal(early.length, 1);
  assert.equal(early[0].length, 1);

  scope.__device = timed(20, [{ id: 1, traditional: '吃', simplified: '吃' }]);
  scope.__server = timed(1, [{ id: 2, traditional: '喫', simplified: '喫' }]);
  const late: unknown[][] = [];
  await service.searchDictionary('chi', 30, rows => late.push(rows));
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.deepEqual(late, [], 'a slower device result never replaces the server answer');
  delete scope.__device; delete scope.__server;
});

test('same-tick lookup and course requests coalesce into one batch', async t => {
  const calls: Array<{ url: string; words: string[] }> = [];
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const { words } = JSON.parse(String(init?.body)) as { words: string[] };
    calls.push({ url: String(input), words });
    return String(input).endsWith('/course')
      ? Response.json([{ id: 'b1_l1_1', front: '你好', traditional: '你好', simplified: '你好', pinyin: 'ni3 hao3', back: 'hello', bookId: 1, lessonId: 1 }])
      : Response.json({ 你好: [{ id: 1, traditional: '你好', simplified: '你好', pinyin_accented: 'nǐ hǎo', definitions: ['hello'] }] });
  });
  const [first, second, courseA, courseB] = await Promise.all([
    lookupDictionaryApi(['你好', '老師']),
    lookupDictionaryApi(['老師', '學生']),
    lookupCourseCardsApi(['你好']),
    lookupCourseCardsApi(['你好', '學生']),
  ]);
  assert.equal(calls.filter(c => c.url.endsWith('/lookup')).length, 1);
  assert.deepEqual(calls.find(c => c.url.endsWith('/lookup'))?.words, ['你好', '老師', '學生']);
  assert.equal(first.get('你好')?.length, 1);
  assert.deepEqual(second.get('學生'), []);
  assert.equal(calls.filter(c => c.url.endsWith('/course')).length, 1);
  assert.equal(courseA.length, 1);
  assert.equal(courseB.length, 1);

});
