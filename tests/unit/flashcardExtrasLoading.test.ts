import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fetchPackedFlashcardExtras } from '../../src/services/contentPacks';
import { flashcardExtrasKey, flashcardExtrasShard, isValidFlashcardExtrasRow, type FlashcardExtrasRow } from '../../src/utils/vocabulary/flashcardExtrasPack';
import type { Flashcard } from '../../src/data/flashcards';

test('course and saved-word lookups fetch only their derivative shards, not source corpora', async () => {
  const sample = JSON.parse(fs.readFileSync('public/data/flashcard-extras/shard-0.json', 'utf8')) as { items: FlashcardExtrasRow[] };
  const course = sample.items.find((row) => row.key.startsWith('["B'))!;
  const [id, front, traditional, simplified, pos] = JSON.parse(course.key) as string[];
  const card: Flashcard = { id, front, traditional, simplified, pos, bookId: 1, lessonId: 1, back: '' };
  const saved: Flashcard = { id: 'saved-word', front: '你好', bookId: 0, lessonId: 0, back: '' };
  const requests: string[] = [];
  const originalFetch = globalThis.fetch;
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const path = String(input);
    requests.push(path);
    assert.ok(path.startsWith('/data/flashcard-extras/'), `Whole-corpus request: ${path}`);
    return new Response(fs.readFileSync(`public${path}`, 'utf8'), { headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  try {
    const packed = await fetchPackedFlashcardExtras(card);
    assert.deepEqual(packed, { examples: course.examples, wordHook: course.wordHook });
    const hook = await fetchPackedFlashcardExtras(saved);
    assert.ok(hook?.wordHook);
    assert.deepEqual(hook.examples, []);
    await fetchPackedFlashcardExtras(card);
    const allowed = new Set(['/data/flashcard-extras/manifest.json', ...[card, saved].map((item) => `/data/flashcard-extras/shard-${flashcardExtrasShard(flashcardExtrasKey(item))}.json`)]);
    assert.deepEqual(new Set(requests), allowed);
    assert.equal(requests.filter((path) => path.endsWith('manifest.json')).length, 1);
    assert.equal(requests.length, allowed.size, 'cached lookup must not fetch again');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('corrupt derivative rows are rejected before reaching sentence rendering', () => {
  assert.ok(!isValidFlashcardExtrasRow(null));
  assert.ok(!isValidFlashcardExtrasRow({ key: 'x', examples: [{}], wordHook: null }));
  assert.ok(!isValidFlashcardExtrasRow({ key: 'x', examples: [], wordHook: {} }));
});
