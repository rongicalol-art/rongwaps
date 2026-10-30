import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildLessonSentences, loadSentenceRecords } from '../../src/screens/sentences/hooks/useLessonSentences';
import type { Flashcard } from '../../src/data/flashcards';
import type { CourseExampleRecord } from '../../src/types/models';

const record = (id: string, traditional: string): CourseExampleRecord => ({
  id, sourceCardId: '', sourceFront: '', sourceMeaning: '', bookId: 1, lessonId: 1, partId: 1,
  traditional, simplified: traditional, pinyin: '', english: '', sourceOcrId: id,
} as unknown as CourseExampleRecord);

const records = [record('B1L01-R01', '短文句子'), record('B1L01-E01', '例句'), record('B1L01-D01L01', '對話句')];
const part = new Set(['1:1:1']);

test('Sentences defaults to the lessons\' authored examples only', () => {
  assert.deepEqual(buildLessonSentences(records, part).map((item) => item.kind), ['example']);
});

test('Including readings adds the dialogue and Reading sentences in book order', () => {
  assert.deepEqual(buildLessonSentences(records, part, true).map((item) => item.kind), ['dialogue', 'reading', 'example']);
});

test('Lesson 10 includes vocabulary examples even when Book 1 already has course records', async (t) => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  });
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
    const path = String(input).split('?')[0];
    return new Response(readFileSync(`public${path}`), { headers: { 'content-type': 'application/json' } });
  });
  const card: Flashcard = {
    id: 'B1L10-1-01', bookId: 1, lessonId: 10, partId: 1,
    front: '感冒', traditional: '感冒', simplified: '感冒', pos: 'Vp', back: 'to catch a cold',
  };
  const loaded = await loadSentenceRecords([card]);
  const sentences = buildLessonSentences(loaded, new Set(['1:10:1']));
  assert.ok(sentences.some(({ record }) => record.traditional === '我感冒了，想在家休息。'));
  assert.ok(loaded.some((record) => record.lessonId === 10 && record.id.includes('-D')));
  assert.equal(new Set(sentences.map(({ record }) => record.traditional)).size, sentences.length);
});
