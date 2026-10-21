import assert from 'node:assert/strict';
import test from 'node:test';
import { searchDictionaryIndex } from '../../src/services/dictionarySearchWorker';
import { searchInIndex, type CompactSearchEntry } from '../../src/utils/vocabulary/dictionarySearch';

test('dictionary worker receives index bytes once and concurrent searches share initialization', async (t) => {
  const originalWorker = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
  const originalFetch = globalThis.fetch;
  const rows: CompactSearchEntry[] = [[1, '老师', '老師', 'lǎoshī', 'laoshi', ['teacher'], 99]];
  let fetches = 0;
  let transfers = 0;
  const workers: FakeWorker[] = [];
  class FakeWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: (() => void) | null = null;
    onmessageerror: (() => void) | null = null;
    index: CompactSearchEntry[] = [];
    terminated = false;
    constructor() { workers.push(this); }
    terminate() { this.terminated = true; }
    postMessage(message: { id: number; buffer?: ArrayBuffer; query?: string; limit: number }, transfer: Transferable[]) {
      const copy = structuredClone(message, { transfer });
      if (copy.buffer) {
        transfers++;
        assert.equal(message.buffer!.byteLength, 0, 'the UI transfers ownership instead of copying the full index');
        this.index = JSON.parse(new TextDecoder().decode(copy.buffer)).items;
      }
      queueMicrotask(() => this.onmessage?.({ data: {
        id: copy.id, result: copy.query ? searchInIndex(this.index, copy.query, copy.limit) : [],
      } } as MessageEvent));
    }
  }
  Object.defineProperty(globalThis, 'Worker', { configurable: true, value: FakeWorker });
  globalThis.fetch = async () => { fetches++; return Response.json({ items: rows }); };
  t.after(() => {
    workers.forEach((worker) => worker.onerror?.());
    globalThis.fetch = originalFetch;
    if (originalWorker) Object.defineProperty(globalThis, 'Worker', originalWorker);
    else Reflect.deleteProperty(globalThis, 'Worker');
  });
  const results = await Promise.all(['teacher', '老師'].map((query) => searchDictionaryIndex(query, 30, null)));
  assert.equal(fetches, 1);
  assert.equal(transfers, 1);
  assert.equal(workers.length, 1);
  assert.ok(results.every((matches) => matches[0].id === 1));
  workers[0].onerror?.();
  assert.ok(workers[0].terminated, 'failed workers release their index');
  assert.equal((await searchDictionaryIndex('teacher', 30, null))[0].id, 1, 'a later search retries cleanly');
  assert.equal(workers.length, 2);
});
