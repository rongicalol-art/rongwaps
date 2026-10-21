import assert from 'node:assert/strict';
import test from 'node:test';
import type { Flashcard } from '../../src/data/flashcards';
import { prepareQuizPlan, type PlannedBeat } from '../../src/services/quizPlanner';
import { availableQuizTypes, planQuizRound, wordsForQuizTypes } from '../../src/utils/vocabulary/quizDirector';

const cards: Flashcard[] = ['老師', '學生', '學校', '朋友', '中文', '電腦'].map((front, i) => ({
  id: `preview-${i}`, front, back: `meaning ${i}`, bookId: 1, lessonId: 1, audio: `preview-${i}.mp3`,
  examples: [{ chinese: front, pinyin: 'lǎoshī', english: 'example' }],
}));

test('quiz picker and filtering inspect a large deck linearly instead of building tiles per word', () => {
  let reads = 0;
  const deck = Array.from({ length: 1000 }, (_, i) => ({
    ...cards[i % cards.length], id: String(i), get front() { reads++; return cards[i % cards.length].front; },
  }));
  assert.ok(availableQuizTypes(deck).has('build'));
  assert.ok(reads < 10_000, `${reads} reads for the picker`);
  reads = 0;
  assert.equal(wordsForQuizTypes(deck, ['build']).length, deck.length);
  assert.ok(reads < 10_000, `${reads} reads for filtering`);
});

test('worker plans preserve original card references, deterministic choices and cancellation', async (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
  const workers: FakeWorker[] = [];
  class FakeWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: (() => void) | null = null;
    onmessageerror: (() => void) | null = null;
    terminated = false;
    payload!: { cards: Flashcard[]; options: Parameters<typeof planQuizRound>[1] };
    constructor() { workers.push(this); }
    postMessage(payload: FakeWorker['payload']) { this.payload = payload; }
    terminate() { this.terminated = true; }
    complete() {
      const beats: PlannedBeat[] = planQuizRound(this.payload.cards, this.payload.options).map((beat) => ({
        ...beat, cards: beat.cards.map((card) => card.id), options: beat.options?.map((card) => card.id), shown: beat.shown?.id,
      }));
      this.onmessage?.({ data: { beats } } as MessageEvent);
    }
  }
  Object.defineProperty(globalThis, 'Worker', { configurable: true, value: FakeWorker });
  t.after(() => { if (original) Object.defineProperty(globalThis, 'Worker', original); else Reflect.deleteProperty(globalThis, 'Worker'); });
  const options = { seed: 'worker-round', reviewPass: false };
  const pending = prepareQuizPlan(cards, options, new AbortController().signal);
  assert.equal(workers.length, 1);
  assert.equal(workers[0].payload.cards[0].examples, undefined, 'heavy study data stays on the main thread');
  workers[0].complete();
  const beats = await pending;
  assert.deepEqual(JSON.parse(JSON.stringify(beats)), JSON.parse(JSON.stringify(planQuizRound(cards, options))));
  assert.strictEqual(beats[0].cards[0], cards.find((card) => card.id === beats[0].cards[0].id));
  assert.ok(workers[0].terminated, 'completed workers release their heap');

  const controller = new AbortController();
  const cancelled = prepareQuizPlan(cards, options, controller.signal);
  controller.abort();
  await assert.rejects(cancelled, { name: 'AbortError' });
  assert.ok(workers[1].terminated);
  workers[1].complete(); // A queued reply after cancellation must do nothing.
  await assert.rejects(prepareQuizPlan(cards, options, controller.signal), { name: 'AbortError' });
  assert.equal(workers.length, 2, 'already-aborted work never creates another worker');
});
