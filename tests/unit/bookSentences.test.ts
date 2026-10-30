import assert from 'node:assert/strict';
import test from 'node:test';

import { exampleSentenceRecords, readingSentenceRecords } from '../../src/screens/sentences/utils/bookSentences';
import type { DialogueAlignment, ReadingRecord } from '../../src/types/models';
import type { Flashcard } from '../../src/data/flashcards';
import type { FlashcardExtras } from '../../src/utils/vocabulary/flashcardExtrasPack';

const reading = (bookId: number, id: string): ReadingRecord => ({
  id, bookId, lessonId: 1, dialogueNumber: 2, title: '', setting: '', printedPages: [], audioReference: '01-2-1',
  paragraphs: [{ speaker: 'A', traditional: '你好。', simplified: '你好。', pinyin: '', english: 'Hello.', audio: { voice: 'studio', file: 'studio.mp3' } }],
});
const alignment = (id: string): Record<string, DialogueAlignment> => ({
  [id]: { audioFile: 'track.mp3', lessonId: 1, dialogueNumber: 2, trimSec: 0, lines: [{ index: 0, text: '你好。', start: 1, end: 2.5 }] } as unknown as DialogueAlignment,
});

test('a dialogue line belongs to its dialogue-numbered part and sorts as a dialogue line', () => {
  const [record] = readingSentenceRecords([reading(3, 'B3L01-R02')], null);
  assert.equal(record.partId, 2);
  assert.equal(record.id, 'B3L01-R02-D02L01');
  assert.equal(record.english, 'Hello.');
});

test('a dialogue line plays the hosted book track first, its studio recording otherwise', () => {
  const [hostedBook1] = readingSentenceRecords([reading(1, 'B1L01-R02')], alignment('B1L01-R02'));
  assert.deepEqual(hostedBook1.audio, { voice: 'book', file: 'B1-01-2-1.mp3', start: 1, end: 2.5 });
  const [hostedBook3] = readingSentenceRecords([reading(3, 'B3L01-R02')], alignment('B3L01-R02'));
  assert.deepEqual(hostedBook3.audio, { voice: 'book', file: 'B3-01-2-1.mp3', start: 1, end: 2.5 });
  const [hostedBook2] = readingSentenceRecords([reading(2, 'B2L01-R02')], alignment('B2L01-R02'));
  assert.deepEqual(hostedBook2.audio, { voice: 'book', file: 'B2-01-2-1.mp3', start: 1, end: 2.5 });
});

test('only a word\'s own examples become sentences', () => {
  const card: Flashcard = { id: 'B3L01-1-01', bookId: 3, lessonId: 1, partId: 1, front: '夢想', pinyin: 'mèngxiǎng', back: 'dream' };
  const example = (sourceCardId: string, chinese: string) => ({
    chinese, pinyin: 'p', english: 'e', sourceCardId, sourceFront: '', sourceBookId: 3, sourceLessonId: 1, sourcePartId: 1, rank: 1,
  });
  const extras = { wordHook: null, examples: [example('B3L01-1-01', '我的夢想。'), example('B3L02-1-05', '別的。')] } as unknown as FlashcardExtras;
  const records = exampleSentenceRecords([card], [extras]);
  assert.deepEqual(records.map((record) => [record.id, record.traditional, record.partId]), [['B3L01-1-01-E01', '我的夢想。', 1]]);
});
