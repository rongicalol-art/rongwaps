import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { searchDictionaryOffline } from '../../src/services/dictionarySearchService';
import { type CompactSearchEntry, searchInIndex } from '../../src/utils/vocabulary/dictionarySearch';
import { fetchExamples } from '../../src/services/vocabularyService';
import { fetchDictionaryRowsFromPacks } from '../../src/services/contentPacks';
import { getDictionaryShard } from '../../src/utils/vocabulary/dictionaryShard';

test('exact dictionary results publish while the index is still downloading, then broader results arrive', async (t) => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalWorker = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
  const originalFetch = globalThis.fetch;
  const workers: FakeWorker[] = [];
  class FakeWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: (() => void) | null = null;
    onmessageerror: (() => void) | null = null;
    index: CompactSearchEntry[] = [];
    constructor() { workers.push(this); }
    terminate() {}
    postMessage(message: { id: number; buffer?: ArrayBuffer; query?: string; limit: number }) {
      if (message.buffer) this.index = JSON.parse(new TextDecoder().decode(message.buffer)).items;
      queueMicrotask(() => this.onmessage?.({ data: { id: message.id,
        result: message.query ? searchInIndex(this.index, message.query, message.limit) : [] } } as MessageEvent));
    }
  }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  Object.defineProperty(globalThis, 'Worker', { configurable: true, value: FakeWorker });
  let releaseIndex!: (response: Response) => void;
  const index = new Promise<Response>((resolve) => { releaseIndex = resolve; });
  globalThis.fetch = async (input) => String(input).includes('dictionary-search-index') ? index
    : new Response(fs.readFileSync(`public${String(input)}`), { headers: { 'content-type': 'application/json' } });
  t.after(() => {
    workers.forEach((worker) => worker.onerror?.());
    globalThis.fetch = originalFetch;
    for (const [name, original] of [['window', originalWindow], ['Worker', originalWorker]] as const) {
      if (original) Object.defineProperty(globalThis, name, original); else Reflect.deleteProperty(globalThis, name);
    }
  });
  let publish!: (results: Awaited<ReturnType<typeof searchDictionaryOffline>>) => void;
  const exact = new Promise<Awaited<ReturnType<typeof searchDictionaryOffline>>>((resolve) => { publish = resolve; });
  let finished = false;
  const full = searchDictionaryOffline('老師', 30, publish).then((results) => { finished = true; return results; });
  const first = await exact;
  assert.ok(first.some((row) => row.traditional === '老師'));
  assert.equal(finished, false, 'an 11 MB index download cannot delay the exact result');
  releaseIndex(Response.json({ items: [[999999, '老师傅', '老師傅', 'lǎoshīfu', 'laoshifu', ['master craftsman'], 70]] }));
  assert.ok((await full).some((row) => row.traditional === '老師傅'), 'broader matches still complete the search');
});

test('course dictionary examples reuse their generated extras instead of loading the course-example corpus', async (t) => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalFetch = globalThis.fetch;
  const paths: string[] = [];
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  globalThis.fetch = async (input) => {
    paths.push(String(input));
    return new Response(fs.readFileSync(`public${String(input)}`), { headers: { 'content-type': 'application/json' } });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow); else Reflect.deleteProperty(globalThis, 'window');
  });
  const examples = await fetchExamples('同學');
  assert.ok(examples.length > 0);
  assert.ok(paths.some((path) => path.includes('/flashcard-extras/shard-')));
  assert.ok(!paths.some((path) => path.includes('/course-examples/')));
  const count = paths.length;
  assert.deepEqual(await fetchExamples('同學'), examples);
  assert.equal(paths.length, count, 'the second lookup makes no network requests');
});

test('a warm index publishes results without waiting for a slower exact shard', async (t) => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalWorker = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
  const originalFetch = globalThis.fetch;
  const word = ['電腦', '咖啡', '圖書館'].find((value) => getDictionaryShard(value) !== getDictionaryShard('老師'))!;
  const workers: FakeWorker[] = [];
  class FakeWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: (() => void) | null = null;
    onmessageerror: (() => void) | null = null;
    constructor() { workers.push(this); }
    terminate() {}
    postMessage(message: { id: number; query?: string }) {
      queueMicrotask(() => this.onmessage?.({ data: { id: message.id, result: message.query
        ? [{ id: -1, traditional: word, simplified: word, pinyin_accented: '', definitions: ['fixture'], match_type: 'exact', total_score: 6000 }] : [] } } as MessageEvent));
    }
  }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  Object.defineProperty(globalThis, 'Worker', { configurable: true, value: FakeWorker });
  let releaseShard!: () => void;
  const waiting = new Promise<void>((resolve) => { releaseShard = resolve; });
  globalThis.fetch = async (input) => {
    const path = String(input);
    if (path.includes('dictionary-search-index')) return Response.json({ items: [] });
    if (path.includes('/dictionary/shard-')) await waiting;
    return new Response(fs.readFileSync(`public${path}`), { headers: { 'content-type': 'application/json' } });
  };
  t.after(() => {
    releaseShard();
    workers.forEach((worker) => worker.onerror?.());
    globalThis.fetch = originalFetch;
    for (const [name, original] of [['window', originalWindow], ['Worker', originalWorker]] as const) {
      if (original) Object.defineProperty(globalThis, name, original); else Reflect.deleteProperty(globalThis, name);
    }
  });
  let publish!: (results: Awaited<ReturnType<typeof searchDictionaryOffline>>) => void;
  const first = new Promise<Awaited<ReturnType<typeof searchDictionaryOffline>>>((resolve) => { publish = resolve; });
  let finished = false;
  const full = searchDictionaryOffline(word, 30, publish).then((rows) => { finished = true; return rows; });
  assert.equal((await first)[0].id, -1);
  assert.equal(finished, false, 'ready results are visible while the exact shard is still downloading');
  releaseShard();
  assert.notEqual((await full)[0].id, -1, 'the final exact shard enriches and deduplicates the index result');
});

test('cancelling preparation stops queued dictionary downloads after the current bounded batch', async (t) => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalFetch = globalThis.fetch;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  const releases: (() => void)[] = [];
  let started!: () => void;
  const firstBatch = new Promise<void>((resolve) => { started = resolve; });
  globalThis.fetch = async (input) => {
    const path = String(input);
    if (path.includes('/dictionary/shard-')) {
      await new Promise<void>((resolve) => { releases.push(resolve); if (releases.length === 4) started(); });
    }
    return new Response(fs.readFileSync(`public${path}`), { headers: { 'content-type': 'application/json' } });
  };
  t.after(() => {
    releases.forEach((release) => release());
    globalThis.fetch = originalFetch;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow); else Reflect.deleteProperty(globalThis, 'window');
  });
  const byShard = new Map<number, string>();
  for (let i = 0; byShard.size < 12; i++) {
    const word = `cancel-fixture-${i}`;
    const shard = getDictionaryShard(word);
    if (shard !== getDictionaryShard('老師')) byShard.set(shard, word);
  }
  const controller = new AbortController();
  const task = fetchDictionaryRowsFromPacks([...byShard.values()], controller.signal);
  await firstBatch;
  controller.abort();
  releases.forEach((release) => release());
  await assert.rejects(task, { name: 'AbortError' });
  assert.equal(releases.length, 4, 'no queued shards begin downloading after cancellation');
});
