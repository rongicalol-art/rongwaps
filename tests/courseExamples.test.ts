import assert from 'node:assert/strict';
import test from 'node:test';
import type { Flashcard } from '../src/data/flashcards';
import {
  extractSearchVariants,
  extractWordVariants,
  findSmartExamplesForWord,
  groupRankedExamples,
  isExampleSourceAvailable,
} from '../src/utils/courseExamples';

const target: Flashcard = {
  id: 'B1L03-2-04',
  bookId: 1,
  lessonId: 3,
  partId: 2,
  front: '喜歡',
  back: 'to like',
};

function source(id: string, bookId: number, lessonId: number, partId: number): Flashcard {
  return {
    id,
    bookId,
    lessonId,
    partId,
    front: `source-${id}`,
    back: '',
    examples: [{ chinese: '我喜歡喝茶。', pinyin: 'wǒ xǐ huān hē chá', english: 'I like drinking tea.' }],
  };
}

test('example availability follows Book, Lesson, Part order', () => {
  assert.equal(isExampleSourceAvailable(target.id, source('B1L02-3-01', 1, 2, 3)), true);
  assert.equal(isExampleSourceAvailable(target.id, source('B1L03-1-08', 1, 3, 1)), true);
  assert.equal(isExampleSourceAvailable(target.id, source('B1L03-2-09', 1, 3, 2)), true);
  assert.equal(isExampleSourceAvailable(target.id, source('B1L03-3-01', 1, 3, 3)), false);
  assert.equal(isExampleSourceAvailable(target.id, source('B1L04-1-01', 1, 4, 1)), false);
  assert.equal(isExampleSourceAvailable(target.id, source('B2L01-1-01', 2, 1, 1)), false);
});

test('smart examples include the whole course; later sources rank as Other', () => {
  const cards = [
    source('B1L02-1-01', 1, 2, 1),
    source('B1L03-1-01', 1, 3, 1),
    source('B1L03-2-09', 1, 3, 2),
    source('B1L03-3-01', 1, 3, 3),
    source('B1L04-1-01', 1, 4, 1),
    source('B2L01-1-01', 2, 1, 1),
    source('B3L01-1-01', 3, 1, 1),
    source('B4L01-1-01', 4, 1, 1),
  ];

  const examples = findSmartExamplesForWord(cards, target.front, target.id);
  assert.deepEqual(examples.map((example) => example.sourceCardId), [
    'B1L03-2-09', // rank 1 — same-Part block anchor
    'B1L03-1-01', // rank 3 — same lesson, earlier Part
    'B1L03-3-01', // rank 3 — same lesson, later Part
    'B1L02-1-01', // rank 4 — previous lesson
    'B1L04-1-01', // rank 5 — later lesson
    'B2L01-1-01', // rank 5 — later book
    'B3L01-1-01',
    'B4L01-1-01',
  ]);
  assert.deepEqual(examples.map((example) => example.rank), [1, 3, 3, 4, 5, 5, 5, 5]);
  assert.ok(examples.some((example) => example.sourceBookId === 4), 'book 4 examples are included');
});

test('filtered source pools still identify the current same-Part anchor', () => {
  const anchor = {
    ...source('B1L01-1-02', 1, 1, 1),
    front: '同學',
    examples: [{ chinese: '他是新同學。', pinyin: 'Tā shì xīn tóngxué.', english: 'He is the new classmate.' }],
  };

  const examples = findSmartExamplesForWord([anchor], '新', 'B1L01-1-01');

  assert.equal(examples[0]?.sourceCardId, 'B1L01-1-02');
  assert.equal(examples[0]?.rank, 1);
});

test('cards without a trustworthy curriculum id do not receive course examples', () => {
  const examples = findSmartExamplesForWord(
    [source('B1L01-1-01', 1, 1, 1)],
    '喜歡',
    'custom-123',
  );

  assert.deepEqual(examples, []);
});

test('ranked examples group into the flashcard reading order', () => {
  const examples = [1, 2, 3, 4, 5].map((rank) => ({
    chinese: `例句${rank}`,
    pinyin: '',
    english: '',
    sourceCardId: `source-${rank}`,
    sourceFront: '喜歡',
    sourceBookId: 1,
    sourceLessonId: rank,
    sourcePartId: 1,
    rank,
  }));

  assert.deepEqual(
    groupRankedExamples(examples).map((group) => [group.id, group.examples.map((example) => example.rank)]),
    [
      ['current-match', [1]],
      ['this-lesson', [2, 3]],
      ['previous-lessons', [4]],
      ['other-lessons', [5]],
    ],
  );
});

test('search variants support slash alternatives, full-width separators, and optional characters', () => {
  assert.deepEqual(extractSearchVariants('腳踏車／自行車'), ['腳踏車', '自行車']);
  assert.deepEqual(extractSearchVariants('臺灣/台灣/台湾'), ['臺灣', '台灣', '台湾']);
  assert.deepEqual(extractSearchVariants('車（子）/汽車'), ['車子', '汽車', '車']);
  assert.deepEqual(extractSearchVariants('常（常）'), ['常常', '常']);
});

test('optional groups expand to every real spoken form, longest first', () => {
  assert.deepEqual(extractSearchVariants('（一）點（兒）'), ['一點兒', '一點', '點兒', '點']);
  assert.deepEqual(extractSearchVariants('有（一）點（兒）'), ['有一點兒', '有一點', '有點兒', '有點']);
  assert.deepEqual(extractSearchVariants('沒（有）空'), ['沒有空', '沒空']);
});

test('word variants combine both scripts and the display front', () => {
  // Longest-first: 3-glyph forms lead, then the 2-glyph alternatives (護士, 护士).
  assert.deepEqual(
    extractWordVariants('護理師', '護理師/護士', '护理师/护士'),
    ['護理師', '护理师', '護士', '护士'],
  );
  // Both scripts expand independently: traditional 一點兒 vs simplified 一点儿.
  assert.deepEqual(
    extractWordVariants('點', '（一）點（兒）', '（一）点（儿）'),
    ['一點兒', '一点儿', '一點', '點兒', '一点', '点儿', '點', '点'],
  );
});

test('longest form present wins within a rank group', () => {
  const full = {
    ...source('B4L01-1-01', 4, 1, 1),
    examples: [{ chinese: '我有一點兒累。', pinyin: '', english: '' }],
  };
  const short = {
    ...source('B4L01-1-02', 4, 1, 1),
    examples: [{ chinese: '我只知道一點。', pinyin: '', english: '' }],
  };
  const examples = findSmartExamplesForWord(
    [short, full],
    ['（一）點（兒）'],
    target.id,
  );
  // Same rank (5, later book): the sentence with the full form leads.
  assert.deepEqual(
    examples.map((example) => example.chinese),
    ['我有一點兒累。', '我只知道一點。'],
  );
});

test('Lesson 15 and 16 block anchor sets resolve Rank 1 for target cards without their own sentence', () => {
  const l15Target: Flashcard = {
    id: 'B1L15-1-01',
    bookId: 1,
    lessonId: 15,
    partId: 1,
    front: '生肖',
    back: '',
    examples: [],
  };
  const l15Anchor: Flashcard = {
    id: 'B1L15-1-02',
    bookId: 1,
    lessonId: 15,
    partId: 1,
    front: '課',
    back: '',
    examples: [{
      chinese: '我們今天要學第十五課，老師會給我們介紹十二生肖。',
      pinyin: "Wǒmen jīntiān yào xué dì shíwǔ kè, lǎoshī huì gěi wǒmen jièshào shí'èr shēngxiào.",
      english: 'We are going to study Lesson 15 today; the teacher will introduce the twelve Chinese zodiac signs to us.',
    }],
  };
  const l15Other: Flashcard = {
    id: 'B1L15-1-10',
    bookId: 1,
    lessonId: 15,
    partId: 1,
    front: '一樣',
    back: '',
    examples: [{
      chinese: '華人和日本人都有十二生肖，十二生肖的動物也一樣嗎？',
      pinyin: "Huárén hé Rìběn rén dōu yǒu shí'èr shēngxiào, shí'èr shēngxiào de dòngwù yě yíyàng ma?",
      english: 'Both Chinese and Japanese people have the twelve zodiac animals. Are the animals of the twelve zodiac signs also the same?',
    }],
  };

  const rankedL15 = findSmartExamplesForWord([l15Target, l15Anchor, l15Other], '生肖', l15Target.id);
  assert.equal(rankedL15[0]?.sourceCardId, 'B1L15-1-02');
  assert.equal(rankedL15[0]?.rank, 1);
  assert.equal(rankedL15[1]?.sourceCardId, 'B1L15-1-10');
  assert.equal(rankedL15[1]?.rank, 2);

  // L16 grouped set: 這次 (04), 上次 (05), 下次 (06)
  const l16Target: Flashcard = {
    id: 'B1L16-1-04',
    bookId: 1,
    lessonId: 16,
    partId: 1,
    front: '這次',
    back: '',
    examples: [],
  };
  const l16Anchor: Flashcard = {
    id: 'B1L16-1-06',
    bookId: 1,
    lessonId: 16,
    partId: 1,
    front: '下次',
    back: '',
    examples: [{
      chinese: '上次我們吃牛肉麵，這次也吃牛肉麵，下次吃別的吧。',
      pinyin: 'Shàng cì wǒmen chī niúròumiàn, zhè cì yě chī niúròumiàn, xià cì chī bié de ba.',
      english: "Last time we ate beef noodles, this time we also ate beef noodles; let's eat something else next time.",
    }],
  };

  const rankedL16 = findSmartExamplesForWord([l16Target, l16Anchor], '這次', l16Target.id);
  assert.equal(rankedL16[0]?.sourceCardId, 'B1L16-1-06');
  assert.equal(rankedL16[0]?.rank, 1);
});

