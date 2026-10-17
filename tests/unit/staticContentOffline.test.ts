import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchStaticJsonWithMetadata } from '../../src/services/staticContentService';

test('network-first metadata survives reload, offline, HTML and invalid updates', async () => {
  const savedFetch = globalThis.fetch;
  const savedWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const savedDb = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
  const values = new Map<string, unknown>();
  function request(result: unknown) {
    const pending = { result, onsuccess: undefined as (() => void) | undefined };
    setTimeout(() => pending.onsuccess?.(), 0);
    return pending;
  }
  const database = {
    transaction: () => {
      const transaction = { oncomplete: undefined as (() => void) | undefined, objectStore: () => store };
      const store = {
        transaction,
        get: (key: string) => request(values.get(key)),
        put: (value: unknown, key: string) => {
          values.set(key, value);
          setTimeout(() => transaction.oncomplete?.(), 0);
        },
      };
      return transaction;
    },
  };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: { open: () => request(database) } });
  const options = {
    persistentKey: 'offline-regression-manifest', revalidate: true, fallbackToPersistent: true,
    validate: (value: unknown) => typeof value === 'object' && value !== null && Reflect.get(value, 'version') === 'valid',
  };
  const load = () => fetchStaticJsonWithMetadata('/offline-test.json', 'offline test', options);
  const good = { version: 'valid' };
  try {
    globalThis.fetch = async () => Response.json(good);
    assert.deepEqual(await load(), { data: good, source: 'network' });
    globalThis.fetch = async () => { throw new Error('offline'); };
    assert.deepEqual(await load(), { data: good, source: 'persistent-cache' });
    globalThis.fetch = async () => new Response('<html>offline shell</html>', { headers: { 'content-type': 'text/html' } });
    assert.deepEqual(await load(), { data: good, source: 'persistent-cache' });
    globalThis.fetch = async () => Response.json({ version: 'invalid' });
    assert.deepEqual(await load(), { data: good, source: 'persistent-cache' });
    assert.deepEqual(values.get('rongwaps-content:offline-regression-manifest'), good);
    globalThis.fetch = async () => Response.json(good);
    assert.equal((await load()).source, 'network');
  } finally {
    globalThis.fetch = savedFetch;
    if (savedWindow) Object.defineProperty(globalThis, 'window', savedWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    if (savedDb) Object.defineProperty(globalThis, 'indexedDB', savedDb);
    else Reflect.deleteProperty(globalThis, 'indexedDB');
  }
});
