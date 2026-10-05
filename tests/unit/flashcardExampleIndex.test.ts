import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { buildExampleIndex } from '../../src/features/flashcards/content/exampleIndex';
import { findSmartExamplesForWord } from '../../src/utils/courseExamples';
import { recordsToExampleCards } from '../../src/utils/packValidators';
import { extractSearchVariants } from '../../src/utils/wordForms';
import type { Flashcard } from '../../src/data/flashcards';

const records = JSON.parse(readFileSync('public/data/course-examples/book-1.json', 'utf8')).records;
const vocabCards: Flashcard[] = [];

test('index lookup matches the brute-force scan for course cards', () => {
  const index = buildExampleIndex(records, vocabCards);
  const seen = new Set<string>();
  const sampleCards: Flashcard[] = records
    .filter((r: { sourceCardId: string }) => !seen.has(r.sourceCardId) && seen.add(r.sourceCardId))
    .slice(0, 40)
    .map((r: { sourceCardId: string; sourceFront: string; sourceMeaning: string; bookId: number; lessonId: number; partId: number }) => ({
      id: r.sourceCardId, front: r.sourceFront, back: r.sourceMeaning,
      bookId: r.bookId, lessonId: r.lessonId, partId: r.partId,
    }) as Flashcard);

  for (const card of sampleCards) {
    const terms = [...new Set(extractSearchVariants(card.front))].sort((a, b) => b.length - a.length);
    const expected = findSmartExamplesForWord(recordsToExampleCards(records, terms, card.pos), [card.front], card.id, card.pos);
    assert.deepEqual(index.lookup(card), expected, `mismatch for ${card.front}`);
  }
});

test('lookup is fast', () => {
  const index = buildExampleIndex(records, vocabCards);
  const card = { id: 'B1L01-1-01', front: '新', back: 'new', bookId: 1, lessonId: 1, partId: 1 } as Flashcard;
  const t0 = performance.now();
  for (let i = 0; i < 100; i += 1) index.lookup(card);
  assert.ok((performance.now() - t0) / 100 < 5);
});

test('falls back to vocabulary examples when no course record matches (books 2-4)', () => {
  const vocab = [{
    id: 'B2L01-1-01', front: '圖書館', back: 'library', bookId: 2, lessonId: 1, partId: 1,
    examples: [{ chinese: '我在圖書館看書。', pinyin: 'Wǒ zài túshūguǎn kàn shū.', english: 'I read in the library.' }],
  }] as Flashcard[];
  const index = buildExampleIndex([], vocab);
  const results = index.lookup({ ...vocab[0], id: 'B2L01-1-01' });
  assert.equal(results.length, 1);
  assert.equal(results[0].chinese, '我在圖書館看書。');
});

test('borrows pos from vocabulary so separable verbs still match', () => {
  const vocab = [
    { id: 'B2L05-1-01', front: '放假', back: 'take a holiday', bookId: 2, lessonId: 5, partId: 1, pos: 'V-sep' },
    { id: 'B2L05-1-02', front: '假期', back: 'holiday', bookId: 2, lessonId: 5, partId: 1,
      examples: [{ chinese: '我們放四天假。', pinyin: 'Wǒmen fàng sì tiān jià.', english: 'We get four days off.' }] },
  ] as Flashcard[];
  const index = buildExampleIndex([], vocab);
  const bare = { id: 'B2L05-1-01', front: '放假', back: 'take a holiday', bookId: 2, lessonId: 5, partId: 1 } as Flashcard;
  assert.equal(index.lookup(bare).length, 1);
});
