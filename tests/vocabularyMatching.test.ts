import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ALL_READINGS } from '../src/data/readings';
import type { ReadingRecord } from '../src/types/models';
import { parseVocabularyId } from '../src/utils/vocabularyId';
import {
  chunksForOccurrence,
  findVocabularyOccurrences,
  tokenizeReading,
  vocabularyTermVariants,
  type VocabularyOccurrence,
} from '../src/utils/vocabularyMatching';

interface VocabularyRow {
  id: string;
  traditional: string | null;
  simplified: string | null;
}

const pack = JSON.parse(
  readFileSync(resolve(process.cwd(), 'public/data/vocabulary/book-1.json'), 'utf8'),
) as { items: VocabularyRow[] };

function card(id: string): VocabularyRow {
  const row = pack.items.find((candidate) => candidate.id === id);
  assert.ok(row, `missing vocabulary row ${id}`);
  return row;
}

function reading(id: string): ReadingRecord {
  const found = ALL_READINGS.find((candidate) => candidate.id === id);
  assert.ok(found, `missing reading ${id}`);
  return found;
}

function synthetic(text: string, pinyin: string, simplified = ''): ReadingRecord {
  return {
    id: 'SYNTH-R01',
    bookId: 1,
    lessonId: 1,
    dialogueNumber: 1,
    title: 'Synthetic',
    setting: 'Test',
    printedPages: [],
    audioReference: '00-0-0',
    paragraphs: [{ speaker: 'A', traditional: text, simplified, pinyin, english: '' }],
  };
}

test('variants expand slash alternates, optional parts and simplifications', () => {
  assert.deepEqual(vocabularyTermVariants({ traditional: '你好/妳好', simplified: '你好' }).sort(), [
    '你好',
    '妳好',
  ]);
  assert.deepEqual(vocabularyTermVariants({ traditional: '想（要）' }).sort(), ['想', '想要']);
  assert.deepEqual(vocabularyTermVariants({ traditional: '臺灣/台灣', simplified: '台湾' }).sort(), [
    '台湾',
    '台灣',
    '臺灣',
  ]);
});

test('a spaced pack compound matches as consecutive word chunks', () => {
  const readingRecord = reading('B1L01-R03');
  const occurrences = findVocabularyOccurrences(
    tokenizeReading(readingRecord),
    vocabularyTermVariants(card('B1L01-3-11')),
  );
  assert.ok(occurrences.length > 0, '珍珠奶茶 should occur in the Lesson 1 essay');
  const occurrence = occurrences[0];
  assert.equal(occurrence.text, '珍珠奶茶');
  assert.equal(
    occurrence.charEnd - occurrence.charStart,
    '珍珠奶茶'.length,
    'the occurrence covers both chunks',
  );
});

test('a slash alternate matches the traditional spelling the text uses', () => {
  const occurrences = findVocabularyOccurrences(
    tokenizeReading(reading('B1L01-R02')),
    vocabularyTermVariants(card('B1L01-2-07')),
  );
  assert.ok(
    occurrences.some((occurrence) => occurrence.text === '妳好'),
    '妳好 in Dialogue 2 should locate 你好/妳好',
  );
});

test('matching never crosses a punctuation break', () => {
  const readingRecord = synthetic('我，愛吃水果。', 'wǒ, ài chī shuǐguǒ');
  const runs = tokenizeReading(readingRecord);
  assert.equal(
    findVocabularyOccurrences(runs, ['我愛']).length,
    0,
    '我，愛 must not become 我愛',
  );
  assert.equal(findVocabularyOccurrences(runs, ['愛']).length, 1);
});

test('a single chunk inside a longer word never matches the shorter term', () => {
  const runs = tokenizeReading(synthetic('她很可愛。', "tā hěn kě'ài"));
  assert.equal(findVocabularyOccurrences(runs, ['可愛']).length, 1);
  assert.equal(findVocabularyOccurrences(runs, ['愛']).length, 0, '愛 must not match inside 可愛');
});

test('occurrence chunks cover every chunk of a multi-chunk word', () => {
  const readingRecord = reading('B1L01-R03');
  const occurrences = findVocabularyOccurrences(
    tokenizeReading(readingRecord),
    vocabularyTermVariants(card('B1L01-3-11')),
  );
  const sentence = readingRecord.paragraphs[4];
  const pinyin = sentence.pinyin;
  assert.ok(pinyin.includes('zhēnzhū nǎichá'));
  const occurrence = occurrences.find(
    (candidate) => candidate.paragraphIndex === 4,
  ) as VocabularyOccurrence;
  assert.ok(occurrence);
  const chunks = tokenizeReading(readingRecord, 'traditional')
    .filter((run) => run.paragraphIndex === 4)
    .flatMap((run) => run.spans);
  const covered = chunksForOccurrence(chunks, occurrence);
  assert.deepEqual(
    covered.map((chunk) => chunk.text),
    ['珍珠', '奶茶'],
  );
});

test('simplified text locations use the simplified variant', () => {
  const readingRecord = reading('B1L01-R03');
  const occurrences = findVocabularyOccurrences(
    tokenizeReading(readingRecord, 'simplified'),
    vocabularyTermVariants(card('B1L01-3-11')),
  );
  assert.ok(occurrences.length > 0);
  assert.ok(occurrences.every((occurrence) => occurrence.script === 'simplified'));
});

test('every vocabulary id used by the fixture resolves to a real pack row', () => {
  for (const row of pack.items) {
    assert.ok(parseVocabularyId(row.id), `unparseable id ${row.id}`);
  }
});
