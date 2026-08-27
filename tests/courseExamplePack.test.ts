import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { recordsToExampleCards } from '../src/services/courseExamplePackService';
import type { CourseExamplePack, CourseExampleRecord } from '../src/types/models';
import { findSmartExamplesForWord } from '../src/utils/courseExamples';

const records: CourseExampleRecord[] = [
  {
    id: 'B1L01-1-02-E01',
    sourceCardId: 'B1L01-1-02',
    sourceFront: '同學',
    sourceMeaning: 'classmate',
    bookId: 1,
    lessonId: 1,
    partId: 1,
    traditional: '他是新同學。',
    pinyin: 'Tā shì xīn tóngxué.',
    english: 'He is the new classmate.',
    printedPage: 36,
    sourceOcrId: 'B1L01-V02',
    provenance: 'textbook-ocr',
    confidence: 'high',
  },
  {
    id: 'B1L01-1-08-E01',
    sourceCardId: 'B1L01-1-08',
    sourceFront: '可愛',
    sourceMeaning: 'lovely; cute',
    bookId: 1,
    lessonId: 1,
    partId: 1,
    traditional: '新同學很可愛。',
    pinyin: 'Xīn tóngxué hěn kěài.',
    english: 'The new classmate is lovely.',
    sourceOcrId: 'B1L01-V08',
    provenance: 'textbook-ocr',
    confidence: 'high',
  },
];

test('course example records become source flashcards with rich sentence metadata', () => {
  const cards = recordsToExampleCards(records, ['新']);
  assert.equal(cards.length, 2);
  assert.deepEqual(cards[0].examples, [{
    chinese: '他是新同學。',
    pinyin: 'Tā shì xīn tóngxué.',
    english: 'He is the new classmate.',
  }]);
  assert.equal(cards[0].partId, 1);
});

test('course example search accepts simplified variants and ignores unrelated sentences', () => {
  const variantRecord: CourseExampleRecord = {
    ...records[0],
    id: 'B1L01-1-02-E02',
    traditional: '歡迎新同學。',
    simplified: '欢迎新同学。',
    pinyin: 'Huānyíng xīn tóngxué.',
    english: 'Welcome, new classmate.',
  };
  const cards = recordsToExampleCards([...records, variantRecord], ['欢迎']);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].examples?.[0].english, 'Welcome, new classmate.');
});

test('group examples remain stored but do not surface for a word absent from the sentence', () => {
  const groupRecord: CourseExampleRecord = {
    ...records[0],
    id: 'B1L04-2-04-E01',
    sourceCardId: 'B1L04-2-04',
    sourceFront: '杯子',
    traditional: '我要一杯珍珠奶茶。',
    pinyin: 'Wǒ yào yì bēi zhēnzhū nǎichá.',
    english: 'I would like to have a cup of bubble milk tea.',
  };
  assert.deepEqual(recordsToExampleCards([groupRecord], ['杯子']), []);
  assert.equal(recordsToExampleCards([groupRecord], ['杯']).length, 1);
});

test('generated Book 1 pack selects term-specific examples from grouped textbook content', () => {
  const pack = JSON.parse(readFileSync(
    new URL('../public/data/course-examples/book-1.json', import.meta.url),
    'utf8',
  )) as CourseExamplePack;

  assert.equal(pack.count, 276);
  const cupSources = recordsToExampleCards(pack.records, ['杯子']);
  const cupExamples = findSmartExamplesForWord(cupSources, '杯子', 'B1L04-2-04');
  assert.deepEqual(cupExamples.map((example) => example.chinese), ['這個杯子一百多塊錢。']);

  const summerSources = recordsToExampleCards(pack.records, ['夏天']);
  const summerExamples = findSmartExamplesForWord(summerSources, '夏天', 'B1L04-3-01');
  assert.deepEqual(summerExamples.map((example) => example.chinese), [
    '台灣夏天的天氣很熱，很多人都喜歡喝飲料。',
    '妳胖了嗎？我不覺得啊，我跟妳一起去看。我也想去買今年夏天的新衣服。',
  ]);
  // The whole course is included: the term-specific sentence leads as the Top
  // match, and the later-lesson dialogue still appears as "Other lesson".
  assert.deepEqual(summerExamples.map((example) => example.rank), [1, 5]);
});

test('later-lesson pack publishes only pinyin-verified dialogue and reading sources', () => {
  const pack = JSON.parse(readFileSync(
    new URL('../public/data/course-examples/book-1.json', import.meta.url),
    'utf8',
  )) as CourseExamplePack;

  assert.ok(pack.records.some((record) => record.sourceOcrId === 'B1L07-D01-L01'));
  assert.ok(pack.records.some((record) => record.sourceOcrId === 'B1L09-RDG01'));
  assert.ok(pack.records.some((record) => record.sourceOcrId === 'B1L10-D01-L01'));
  assert.ok(pack.records.some((record) => record.sourceOcrId === 'B1L10-RDG01'));
  assert.equal(pack.records.some((record) => (
    record.lessonId >= 11 && /-D\d|RDG/.test(record.sourceOcrId)
  )), false);
});
