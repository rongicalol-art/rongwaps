import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { build } from 'esbuild';

// Bundle an isolated service with controlled worker events, including events arriving after termination.
async function fixture() {
  const instances: FakeWorker[] = [];
  class FakeWorker extends EventEmitter {
    messages: Array<{ id: number }> = [];
    constructor() { super(); instances.push(this); }
    ref() {}
    unref() {}
    terminate() { return Promise.resolve(0); }
    postMessage(message: { id: number }) { this.messages.push(message); }
  }
  const key = `dictionary-lifecycle-${Math.random()}`;
  const globals = globalThis as unknown as Record<string, unknown>;
  globals[key] = FakeWorker;
  const bundle = await build({ entryPoints: ['server/dictionary.ts'], bundle: true, platform: 'node', format: 'esm', write: false, packages: 'external', define: { 'import.meta.url': JSON.stringify(import.meta.url) },
    plugins: [{ name: 'worker-fixture', setup(plugin) {
      plugin.onResolve({ filter: /^node:worker_threads$/ }, () => ({ path: 'worker', namespace: 'fixture' }));
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `export const Worker = globalThis[${JSON.stringify(key)}]` }));
    } }],
  });
  const original = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const service = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`) as typeof import('../../server/dictionary');
  return { service, instances, cleanup() { service.closeDictionary(); delete globals[key]; if (original === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = original; } };
}

const flush = () => new Promise<void>(resolve => setImmediate(resolve));

test('closing a starting dictionary rejects immediately and stale workers cannot close its replacement', async () => {
  const { service, instances, cleanup } = await fixture();
  try {
    const first = service.searchDictionary('teacher', 3);
    const rejected = assert.rejects(first, /Dictionary closed/);
    service.closeDictionary();
    // Cancellation settles even if the terminated worker never emits exit.
    await Promise.race([rejected, new Promise((_, reject) => setTimeout(() => reject(new Error('startup remained pending')), 100))]);
    const second = service.searchDictionary('student', 3);
    instances[1].emit('message', { ready: true });
    await flush();
    instances[0].emit('message', { fatal: 'late failure' });
    instances[0].emit('exit', 1);
    instances[1].emit('message', { id: instances[1].messages[0].id, result: ['replacement result'] });
    assert.deepEqual(await second, ['replacement result']);
    const third = service.searchDictionary('school', 3);
    await flush();
    assert.equal(instances.length, 2, 'replacement stays available after stale failure');
    instances[1].emit('message', { id: instances[1].messages[1].id, result: [] });
    assert.deepEqual(await third, []);
  } finally { cleanup(); }
});

test('worker failures preserve their cause for startup and pending requests, then allow recovery', async () => {
  const { service, instances, cleanup } = await fixture();
  try {
    const startup = service.searchDictionary('teacher', 3);
    const startupRejected = assert.rejects(startup, /Dictionary could not load: missing index/);
    instances[0].emit('message', { fatal: 'Dictionary could not load: missing index' });
    await startupRejected;
    const pending = service.searchDictionary('student', 3);
    instances[1].emit('message', { ready: true });
    await flush();
    const failure = new Error('Worker terminated due to reaching memory limit');
    const failed = assert.rejects(pending, error => error === failure);
    instances[1].emit('error', failure);
    await failed;
    const recovered = service.searchDictionary('school', 3);
    instances[2].emit('message', { ready: true });
    await flush();
    instances[2].emit('message', { id: instances[2].messages[0].id, result: [] });
    assert.deepEqual(await recovered, []);
  } finally { cleanup(); }
});
