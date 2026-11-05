import assert from 'node:assert/strict';
import test from 'node:test';
import type { Flashcard } from '../../src/data/flashcards';
import { buildWordEntry, courseCardsByRow, linkCourseReadings, orderReadingKeys, pickReading, readingKey, type DictionaryRowLike } from '../../src/utils/vocabulary/wordEntry';

const card = (front: string, pinyin: string, back: string, bookId: number, lessonId: number, pos?: string): Flashcard =>
  ({ id: `${front}-${bookId}-${lessonId}`, front, traditional: front, pinyin, back, bookId, lessonId, pos });
const row = (id: number, traditional: string, pinyin: string, definitions: string[], simplified = traditional): DictionaryRowLike =>
  ({ id, traditional, simplified, pinyin_accented: pinyin, definitions });

test('reading keys ignore spacing and keep tones', () => {
  assert.equal(readingKey('rén jia'), readingKey('rénjia'));
  assert.notEqual(readingKey('má'), readingKey('ma'));
});

test('a course card links to its own reading, never to another one', () => {
  const rows = [row(1, '嗎', 'má', ['(coll.) what?']), row(2, '嗎', 'mǎ', ['used in 嗎啡|吗啡[ma3 fei1]']), row(3, '嗎', 'ma', ['(question particle for "yes-no" questions)'])];
  const byRow = courseCardsByRow(rows, [card('嗎', 'ma', 'sentence-final particle for a question', 1, 1, 'Ptc')]);
  assert.deepEqual([...byRow.keys()], [3]);

  const scare = [row(4, '嚇', 'hè', ['to scare']), row(5, '嚇', 'xià', ['to frighten, to scare'])];
  assert.deepEqual([...courseCardsByRow(scare, [card('嚇', 'xià', 'scared, frightened', 2, 14, 'Vs-pred')]).keys()], [5]);
});

test('a card that lists two readings teaches both', () => {
  const rows = [row(15, '那', 'nà', ['that']), row(16, '那', 'nèi', ['that (colloquial)']), row(17, '那', 'nǎ', ['variant of 哪[na3]'])];
  assert.deepEqual([...courseCardsByRow(rows, [card('那', 'nà/nèi', 'that', 1, 3, 'Det')]).keys()], [15, 16]);
});

test('Taiwan tones and Taiwan-only readings still find the word', () => {
  const week = [row(6, '星期', 'xīng qī', ['week'])];
  assert.deepEqual([...courseCardsByRow(week, [card('星期', 'xīngqí', 'week', 1, 5, 'N')]).keys()], [6]);
  const trash = [row(7, '垃圾', 'lā jī', ['trash; refuse; garbage'])];
  assert.deepEqual([...courseCardsByRow(trash, [card('垃圾', 'lèsè', 'garbage', 2, 3, 'N')]).keys()], [7]);
});

test('every lesson of a polyphone lands on its own reading, earliest first', () => {
  const rows = [row(8, '長', 'cháng', ['long']), row(9, '長', 'zhǎng', ['chief', 'to grow'])];
  const links = linkCourseReadings(rows, [card('長', 'zhǎng', 'to grow, to develop, to enhance', 3, 1, 'V'), card('長', 'cháng', 'long', 1, 8, 'Vs')]);
  assert.equal(links.get('chang2')?.[0].lessonId, 8);
  assert.equal(links.get('zhang3')?.[0].bookId, 3);
  assert.deepEqual(orderReadingKeys(rows, links), ['chang2', 'zhang3']);
});

test('a variant that shares a simplified form never borrows the word or its lessons', () => {
  const rows = [row(10, '咊', 'hé', ['old variant of 和[he2]'], '和'), row(11, '和', 'hé', ['(joining two nouns) and; together with; with (Taiwan pr. [han4])'])];
  const entry = buildWordEntry('和', rows, [card('和', 'hé/hàn', 'and', 1, 3, 'Conj')]);
  assert.equal(entry?.word, '和');
  assert.equal(entry?.readings.length, 1);
  assert.equal(entry?.readings[0].cards[0].lessonId, 3);
  const variant = buildWordEntry('咊', rows, [card('和', 'hé/hàn', 'and', 1, 3, 'Conj')]);
  assert.equal(variant?.readings[0].cards.length, 0);
  assert.deepEqual(variant?.readings[0].groups[0].senses[0].ref, { word: '和', pinyin: 'hé' });
});

test('the entry leads with the book sense, then only the dictionary senses it does not teach', () => {
  const rows = [row(12, '河', 'hé', ['surname He', 'river (CL:條|条[tiao2],道[dao4])', '(bound form) the Yellow River'])];
  const entry = buildWordEntry('河', rows, [card('河', 'hé', 'river (M: 條 tiáo)', 1, 15, 'N')]);
  const reading = entry!.readings[0];
  assert.equal(reading.headline, 'river');
  assert.deepEqual(reading.groups.map((group) => group.pos), ['N', null]);
  assert.deepEqual(reading.groups[1].senses.map((sense) => sense.text), ['(bound form) the Yellow River']);
  assert.deepEqual(reading.measureWords.map((measure) => measure.char), ['條', '道']);
});

test('the opened reading leads, matched by dictionary or course reading', () => {
  const rows = [row(8, '長', 'cháng', ['long']), row(9, '長', 'zhǎng', ['to grow'])];
  const entry = buildWordEntry('長', rows, [])!;
  assert.equal(pickReading(entry, 'zhǎng')?.key, 'zhang3');
  assert.equal(pickReading(entry, 'zhang3')?.key, 'zhang3');
  assert.equal(pickReading(entry, null)?.key, 'chang2');
});

test('Taiwan reading order breaks ties when no lesson teaches the word', () => {
  const rows = [row(13, '血', 'xuè', ['blood']), row(14, '血', 'xiě', ['blood'])];
  assert.deepEqual(orderReadingKeys(rows, new Map(), ['xiě', 'xuè']), ['xie3', 'xue4']);
});
