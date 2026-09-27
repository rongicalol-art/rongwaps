import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  TEST_ALL_READINGS as ALL_READINGS,
  TEST_INTERACTIVE_GRAMMAR_PARTS as INTERACTIVE_GRAMMAR_PARTS,
} from './acceptance_helpers';
import type { Flashcard } from '../src/data/flashcards';
import type { ReadingRecord } from '../src/types/models';
import { parseVocabularyId } from '../src/utils/vocabularyId';
import { buildReaderStudyTargets } from '../src/screens/reader/utils/readerStudyTargets';

interface VocabularyRow {
  id: string;
  traditional: string | null;
  simplified: string | null;
  meaning: string | null;
  pinyin: string | null;
  pos: string | null;
  audio: string | null;
}

const BOOK_ID = 1;
const bookReadings = ALL_READINGS.filter((reading) => reading.bookId === BOOK_ID);

const pack = JSON.parse(
  readFileSync(resolve(process.cwd(), 'public/data/vocabulary/book-1.json'), 'utf8'),
) as { items: VocabularyRow[] };

const vocabulary: Flashcard[] = pack.items.map((row) => {
  const location = parseVocabularyId(row.id);
  return {
    id: row.id,
    bookId: location?.bookId ?? BOOK_ID,
    lessonId: location?.lessonId ?? 0,
    partId: location?.partId ?? 1,
    front: row.traditional ?? '',
    back: row.meaning ?? '',
    traditional: row.traditional ?? undefined,
    simplified: row.simplified ?? undefined,
    pinyin: row.pinyin ?? '',
    pos: row.pos ?? undefined,
    audio: row.audio ?? undefined,
  } as Flashcard;
});

function reading(id: string): ReadingRecord {
  const found = bookReadings.find((candidate) => candidate.id === id);
  assert.ok(found, `missing reading ${id}`);
  return found;
}

test('a dialogue targets its own course part words, not the whole lesson', () => {
  const targets = buildReaderStudyTargets({
    reading: reading('B1L01-R01'),
    parts: INTERACTIVE_GRAMMAR_PARTS,
    vocabulary,
  });

  assert.equal(targets.usingLessonFallback, false);
  assert.equal(targets.targetWords.length, 19, 'Lesson 1 Part 1 has 19 words');
  assert.equal(targets.lessonWords.length, 44, 'the lesson list stays available as fallback');

  const inText = targets.targetWords.filter((word) => word.inText).map((word) => word.traditional);
  assert.deepEqual(inText.sort(), [
    '可愛',
    '同學',
    '哪',
    '國',
    '她',
    '妳',
    '很',
    '新',
    '日本',
    '漂亮',
    '知道',
    '誰',
    '嗎',
    '叫',
  ].sort());
});

test('a word is only "in text" when its own segmented unit occurs', () => {
  const synthetic: ReadingRecord = {
    id: 'SYNTH-R01',
    bookId: BOOK_ID,
    lessonId: 1,
    dialogueNumber: 1,
    title: 'Synthetic',
    setting: 'Test',
    printedPages: [],
    audioReference: '00-0-0',
    paragraphs: [
      {
        speaker: 'A',
        traditional: '她很可愛。',
        simplified: '她很可爱。',
        pinyin: 'tā hěn kěài',
        english: 'She is cute.',
      },
    ],
  };
  const targets = buildReaderStudyTargets({
    reading: synthetic,
    parts: INTERACTIVE_GRAMMAR_PARTS,
    vocabulary: [
      { ...vocabulary[0], id: 'B1L01-3-90', lessonId: 1, front: '可愛', traditional: '可愛', simplified: '可爱', partId: 1, back: 'cute' },
      { ...vocabulary[0], id: 'B1L01-3-91', lessonId: 1, front: '愛', traditional: '愛', simplified: '爱', partId: 1, back: 'love' },
    ],
  });

  const cute = targets.targetWords.find((word) => word.traditional === '可愛');
  const love = targets.targetWords.find((word) => word.traditional === '愛');
  assert.equal(cute?.inText, true);
  assert.equal(love?.inText, false, '愛 must not match inside 可愛');
});

test('pack compounds and authored alternates are found across the segmentation', () => {
  const cases: Array<[string, string[], 'target' | 'lesson']> = [
    ['B1L01-R02', ['你好/妳好'], 'target'],
    ['B1L01-R03', ['珍珠奶茶', '奶茶'], 'target'],
    ['B1L03-R01', ['想（要）'], 'target'],
    ['B1L03-R02', ['常（常）'], 'target'],
    ['B1L05-R02', ['裡（面）', '上（面）', '下（面）'], 'target'],
    // Part-scoped lists hide other parts' words, but the lesson list still
    // flags them as used in the essay text.
    ['B1L15-R03', ['元宵節', '燈籠', '生肖'], 'lesson'],
  ];
  for (const [readingId, words, scope] of cases) {
    const targets = buildReaderStudyTargets({
      reading: reading(readingId),
      parts: INTERACTIVE_GRAMMAR_PARTS,
      vocabulary,
    });
    const list = scope === 'target' ? targets.targetWords : targets.lessonWords;
    for (const word of words) {
      const target = list.find((candidate) => candidate.traditional === word);
      assert.ok(target, `${readingId} ${scope} list should contain ${word}`);
      assert.equal(target.inText, true, `${readingId} ${word} should be in text`);
    }
  }
});

const inTextFixture = JSON.parse(
  readFileSync(resolve(process.cwd(), 'tests/fixtures/readerStudyTargets.json'), 'utf8'),
) as Record<string, string[]>;

test('per-reading in-text words match the reviewed snapshot', () => {
  for (const candidate of bookReadings) {
    const targets = buildReaderStudyTargets({
      reading: candidate,
      parts: INTERACTIVE_GRAMMAR_PARTS,
      vocabulary,
    });
    const actual = targets.targetWords
      .filter((word) => word.inText)
      .map((word) => word.id)
      .sort();
    assert.deepEqual(actual, inTextFixture[candidate.id], `${candidate.id} in-text words`);
  }
});

test('a dialogue lists the whole lesson, own part first, other parts as context', () => {
  const r01 = buildReaderStudyTargets({
    reading: reading('B1L01-R01'),
    parts: INTERACTIVE_GRAMMAR_PARTS,
    vocabulary,
  });
  assert.equal(r01.grammarPoints.length, 5, 'the whole lesson stays listed');
  const r01Part = r01.grammarPoints.filter((point) => point.group === 'part');
  const r01Also = r01.grammarPoints.filter((point) => point.group === 'also');
  assert.deepEqual(
    r01Part.map((point) => point.id),
    ['B1L01-G01-P38', 'B1L01-G02-P39', 'B1L01-G03-P40'],
  );
  assert.ok(r01Part.every((point) => point.usage === 'target'));
  assert.deepEqual(
    r01Also.map((point) => point.id),
    ['B1L01-G04-P44', 'B1L01-G05-P45'],
    'every other-part page is listed, used or not',
  );
  assert.equal(
    r01.grammarPoints.find((point) => point.id === 'B1L01-G04-P44')?.usage,
    'none',
    'an unused other-part page is still listed (the card dims it)',
  );

  const r02 = buildReaderStudyTargets({
    reading: reading('B1L01-R02'),
    parts: INTERACTIVE_GRAMMAR_PARTS,
    vocabulary,
  });
  assert.equal(r02.grammarPoints.length, 5);
  assert.deepEqual(
    r02.grammarPoints.filter((point) => point.group === 'part').map((point) => point.id),
    ['B1L01-G04-P44', 'B1L01-G05-P45'],
  );
  assert.deepEqual(
    r02.grammarPoints.filter((point) => point.group === 'also').map((point) => point.id),
    ['B1L01-G01-P38', 'B1L01-G02-P39', 'B1L01-G03-P40'],
    'earlier-part pages are listed as review, used or not',
  );
});

test('a short essay has no target part but still reports used lesson patterns', () => {
  const targets = buildReaderStudyTargets({
    reading: reading('B1L04-R03'),
    parts: INTERACTIVE_GRAMMAR_PARTS,
    vocabulary,
  });

  assert.equal(targets.grammarPoints.length, 5);
  assert.ok(targets.grammarPoints.every((point) => point.usage !== 'target'));
  const used = targets.grammarPoints.filter((point) => point.usage === 'detected');
  assert.deepEqual(used.map((point) => point.id), ['B1L04-G05-P105']);
  assert.ok(used[0].usageEvidence);
});

test('every reading resolves a non-empty target word list from its own part', () => {
  for (const candidate of bookReadings) {
    const targets = buildReaderStudyTargets({
      reading: candidate,
      parts: INTERACTIVE_GRAMMAR_PARTS,
      vocabulary,
    });
    assert.ok(
      targets.targetWords.length > 0,
      `${candidate.id} (part ${candidate.dialogueNumber}) should have target words`,
    );
    assert.equal(targets.usingLessonFallback, false, `${candidate.id} should not need the fallback`);
  }
});
