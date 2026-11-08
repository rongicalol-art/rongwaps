import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { fetchStaticJsonWithMetadata } from '../../src/services/staticContentService';

// A sleeping server (Render free plan) takes about a minute to answer the first request.
async function withBrowser(run: (sent: RequestCache[]) => Promise<void>) {
  const savedFetch = globalThis.fetch;
  const savedWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    await run([]);
  } finally {
    mock.timers.reset();
    globalThis.fetch = savedFetch;
    if (savedWindow) Object.defineProperty(globalThis, 'window', savedWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
}

const load = () => fetchStaticJsonWithMetadata<{ version: string }>('/slow-test.json', 'slow test', { revalidate: true });
const asleep = (signal?: AbortSignal | null) => new Promise<Response>((_resolve, reject) => {
  const abort = () => reject(new DOMException('Aborted', 'AbortError'));
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort);
});
// Lets pending promise steps run (fake timers only replace setTimeout).
const settle = () => new Promise((resolve) => setImmediate(resolve));

test('with a saved copy, a sleeping server holds the app for 4 seconds at most', () => withBrowser(async (sent) => {
  globalThis.fetch = async (_url, init) => {
    sent.push(init?.cache ?? 'default');
    return init?.cache === 'force-cache' ? Response.json({ version: 'saved' }) : asleep(init?.signal);
  };
  const result = load();
  await settle();
  // The saved copy is read before the server check starts: a pending check would hold it.
  assert.deepEqual(sent, ['force-cache', 'no-cache']);
  mock.timers.tick(3_999);
  await settle();
  mock.timers.tick(1);
  assert.deepEqual((await result).data, { version: 'saved' });
}));

test('an awake server answers with the newer version', () => withBrowser(async (sent) => {
  globalThis.fetch = async (_url, init) => {
    sent.push(init?.cache ?? 'default');
    return Response.json({ version: init?.cache === 'force-cache' ? 'saved' : 'fresh' });
  };
  assert.deepEqual((await load()).data, { version: 'fresh' });
  assert.deepEqual(sent, ['force-cache', 'no-cache']);
}));

test('a copy the server sent within the last minute is not checked again', () => withBrowser(async (sent) => {
  // First visit: nothing is saved, so the saved-copy read itself reached the server.
  globalThis.fetch = async (_url, init) => {
    sent.push(init?.cache ?? 'default');
    return Response.json({ version: 'fresh' }, { headers: { date: new Date().toUTCString() } });
  };
  assert.deepEqual((await load()).data, { version: 'fresh' });
  assert.deepEqual(sent, ['force-cache']);
}));

test('a server error keeps the saved copy', () => withBrowser(async () => {
  globalThis.fetch = async (_url, init) => (init?.cache === 'force-cache'
    ? Response.json({ version: 'saved' })
    : new Response('busy', { status: 503 }));
  assert.deepEqual((await load()).data, { version: 'saved' });
}));

test('without a saved copy the app waits for the waking server', () => withBrowser(async (sent) => {
  let wake: (response: Response) => void = () => {};
  globalThis.fetch = async (_url, init) => {
    sent.push(init?.cache ?? 'default');
    // With nothing saved, the browser sends the saved-copy request on to the server.
    return new Promise<Response>((resolve) => { wake = resolve; });
  };
  const result = load();
  mock.timers.tick(1_000);
  await settle();
  mock.timers.tick(49_000);
  wake(Response.json({ version: 'fresh' }));
  assert.deepEqual((await result).data, { version: 'fresh' });
  assert.deepEqual(sent, ['force-cache']);
}));

test('a server still asleep after 75 seconds fails instead of hanging', () => withBrowser(async () => {
  globalThis.fetch = async (_url, init) => asleep(init?.signal);
  const result = load();
  mock.timers.tick(1_000);
  await settle();
  mock.timers.tick(74_000);
  await assert.rejects(result, { name: 'AbortError' });
}));
