import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

// The dictionary client with a controllable worker in place of the real one.
async function fixture() {
  const instances: FakeWorker[] = [];
  class FakeWorker {
    messages: Array<Record<string, unknown>> = [];
    terminated = false;
    onmessage: ((event: { data: unknown }) => void) | null = null;
    onerror: (() => void) | null = null;
    constructor() { instances.push(this); }
    postMessage(message: Record<string, unknown>) { this.messages.push(message); }
    terminate() { this.terminated = true; }
    emit(data: unknown) { this.onmessage?.({ data }); }
  }
  const fetched: string[] = [];
  const key = `dictionary-client-${Math.random()}`;
  const globals = globalThis as unknown as Record<string, unknown>;
  globals[key] = { fetchContent: async (path: string) => { fetched.push(path); return path.includes('missing') ? new Response('', { status: 404 }) : Response.json({ ok: path }); } };
  const bundle = await build({ entryPoints: ['src/services/dictionaryApi.ts'], bundle: true, platform: 'node', format: 'esm', write: false,
    define: { 'import.meta.url': JSON.stringify(import.meta.url) },
    plugins: [{ name: 'client-fixture', setup(plugin) {
      plugin.onResolve({ filter: /staticContentService$/ }, () => ({ path: 'content', namespace: 'fixture' }));
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `export const fetchContent = (...args) => globalThis[${JSON.stringify(key)}].fetchContent(...args);` }));
    } }],
  });
  const hadWorker = 'Worker' in globals;
  const originalWorker = globals.Worker;
  globals.Worker = FakeWorker;
  const service = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`) as typeof import('../../src/services/dictionaryApi');
  return { service, instances, fetched, cleanup() { service.closeDictionary(); delete globals[key]; if (hadWorker) globals.Worker = originalWorker; else delete globals.Worker; } };
}

const flush = () => new Promise<void>(resolve => setImmediate(resolve));

test('requests share one worker; the page fetches the packs it asks for, with the session', async () => {
  const { service, instances, fetched, cleanup } = await fixture();
  try {
    const search = service.searchDictionaryApi('teacher', 3);
    const examples = service.lookupExamplesApi('同學', 2);
    assert.equal(instances.length, 1);
    const [worker] = instances;
    assert.deepEqual(worker.messages.map(({ kind }) => kind), ['search', 'examples']);
    worker.emit({ load: 1, path: '/data/search/dictionary-search-index.json' });
    worker.emit({ load: 2, path: '/data/missing.json' });
    await flush(); await flush();
    assert.deepEqual(fetched, ['/data/search/dictionary-search-index.json', '/data/missing.json']);
    const answers = worker.messages.slice(2) as Array<{ loaded: number; buffer?: ArrayBuffer; error?: string }>;
    const loaded = answers.find(answer => answer.loaded === 1)!;
    const failed = answers.find(answer => answer.loaded === 2)!;
    assert.deepEqual(JSON.parse(new TextDecoder().decode(loaded.buffer)), { ok: '/data/search/dictionary-search-index.json' });
    assert.deepEqual([failed.loaded, failed.error], [2, '/data/missing.json returned 404']);
    worker.emit({ id: worker.messages[1].id, result: ['an example'] });
    worker.emit({ id: worker.messages[0].id, error: 'Dictionary unavailable. Please try again.' });
    assert.deepEqual(await examples, ['an example']);
    await assert.rejects(search, /Dictionary unavailable/);
  } finally { cleanup(); }
});

test('a crashed worker fails its pending requests and the next request starts a fresh one', async () => {
  const { service, instances, cleanup } = await fixture();
  try {
    const first = service.searchDictionaryApi('teacher', 3);
    instances[0].onerror?.();
    await assert.rejects(first, /Dictionary worker failed/);
    assert.equal(instances[0].terminated, true);
    const second = service.searchDictionaryApi('student', 3);
    assert.equal(instances.length, 2);
    // A late message from the dead worker cannot answer the new request.
    instances[0].emit({ id: instances[1].messages[0].id, result: ['stale'] });
    instances[1].emit({ id: instances[1].messages[0].id, result: ['fresh'] });
    assert.deepEqual(await second, ['fresh']);
  } finally { cleanup(); }
});

test('a cancelled lookup rejects at once and sends no further batches', async () => {
  const { service, instances, cleanup } = await fixture();
  try {
    const controller = new AbortController();
    const lookup = service.lookupDictionaryApi(Array.from({ length: 130 }, (_, id) => `fixture-${id}`), controller.signal);
    await flush();
    assert.equal((instances[0].messages[0].words as string[]).length, 64);
    controller.abort();
    await assert.rejects(lookup, { name: 'AbortError' });
    instances[0].emit({ id: instances[0].messages[0].id, result: {} });
    await flush();
    assert.equal(instances[0].messages.length, 1);
  } finally { cleanup(); }
});

test('same-tick lookup and course requests coalesce into one batch each', async () => {
  const { service, instances, cleanup } = await fixture();
  try {
    const all = Promise.all([
      service.lookupDictionaryApi(['你好', '老師']),
      service.lookupDictionaryApi(['老師', '學生']),
      service.lookupCourseCardsApi(['你好']),
      service.lookupCourseCardsApi(['你好', '學生']),
    ]);
    await flush();
    const [worker] = instances;
    const lookups = worker.messages.filter(message => message.kind === 'lookup');
    const courses = worker.messages.filter(message => message.kind === 'course');
    assert.deepEqual(lookups.map(message => message.words), [['你好', '老師', '學生']]);
    assert.deepEqual(courses.map(message => message.words), [['你好', '學生']]);
    worker.emit({ id: lookups[0].id, result: { 你好: [{ id: 1, traditional: '你好' }], 老師: [], 學生: [] } });
    worker.emit({ id: courses[0].id, result: [{ id: 'b1_l1_1', front: '你好' }] });
    const [first, second, courseA, courseB] = await all;
    assert.equal(first.get('你好')?.length, 1);
    assert.deepEqual(second.get('學生'), []);
    assert.equal(courseA.length, 1);
    assert.equal(courseB.length, 1);
  } finally { cleanup(); }
});
