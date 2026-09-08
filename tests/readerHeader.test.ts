import assert from 'node:assert/strict';
import test from 'node:test';
import { getLessonTitles, getReaderHeaderTitles } from '../src/screens/reader/components/ReaderHeader';
import type { ReadingRecord } from '../src/types/models';

test('derives lesson titles correctly from standard lesson format', () => {
  const titles = getLessonTitles('The New Classmate · 新同學');
  assert.equal(titles.chineseTitle, '新同學');
  assert.equal(titles.englishTitle, 'The New Classmate');
});

test('handles fallback when lesson title is missing or plain string', () => {
  const titles = getLessonTitles(undefined, 'Fallback Title');
  assert.equal(titles.chineseTitle, 'Fallback Title');
  assert.equal(titles.englishTitle, '');
});

test('derives titles for 3-part narrative readings', () => {
  const reading = {
    id: 'B1L01-R03',
    bookId: 1,
    lessonId: 1,
    dialogueNumber: 3,
    title: '短文 · 自我介紹 · Self-Introduction',
    setting: '短文 · Reading',
    printedPages: [47, 48],
    audioReference: '01-3-1',
    paragraphs: [],
  } as unknown as ReadingRecord;

  const titles = getReaderHeaderTitles(reading, 'The New Classmate · 新同學');
  assert.equal(titles.chineseTitle, '自我介紹');
  assert.equal(titles.englishTitle, 'Self-Introduction');
});

test('derives titles for 2-part non-generic readings', () => {
  const reading = {
    id: 'B1L15-R03',
    bookId: 1,
    lessonId: 15,
    dialogueNumber: 3,
    title: '有趣的十二生肖 · The Interesting Zodiac',
    setting: '短文 · Reading',
    printedPages: [350, 351],
    audioReference: '15-3-1',
    paragraphs: [],
  } as unknown as ReadingRecord;

  const titles = getReaderHeaderTitles(reading, 'The Chinese Animal Zodiac · 十二生肖');
  assert.equal(titles.chineseTitle, '有趣的十二生肖');
  assert.equal(titles.englishTitle, 'The Interesting Zodiac');
});

test('falls back to lesson title for generic dialogue readings', () => {
  const reading = {
    id: 'B1L01-R01',
    bookId: 1,
    lessonId: 1,
    dialogueNumber: 1,
    title: '對話一 · Dialogue 1',
    setting: '對話一 · Dialogue 1',
    printedPages: [40, 41],
    audioReference: '01-1-1',
    paragraphs: [],
  } as unknown as ReadingRecord;

  const titles = getReaderHeaderTitles(reading, 'The New Classmate · 新同學');
  assert.equal(titles.chineseTitle, '新同學');
  assert.equal(titles.englishTitle, 'The New Classmate');
});

test('handles 2-part narrative readings with generic prefix', () => {
  const reading = {
    id: 'B1L01-R03-test',
    bookId: 1,
    lessonId: 1,
    dialogueNumber: 3,
    title: '短文 · 自我介紹',
    setting: '短文 · Reading',
    printedPages: [47, 48],
    audioReference: '01-3-1',
    paragraphs: [],
  } as unknown as ReadingRecord;

  const titles = getReaderHeaderTitles(reading, 'The New Classmate · 新同學');
  assert.equal(titles.chineseTitle, '自我介紹');
  assert.equal(titles.englishTitle, 'The New Classmate');
});
