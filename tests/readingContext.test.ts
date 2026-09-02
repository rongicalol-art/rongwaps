import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveActiveReadingIndex } from '../src/utils/readingContext';
import type { ReadingRecord } from '../src/types/models';

const mockReadings: ReadingRecord[] = [
  {
    id: 'B1L01-R01',
    bookId: 1,
    lessonId: 1,
    dialogueNumber: 1,
    title: '在學校',
    setting: '教室裡',
    printedPages: [1, 2],
    audioReference: '1-1',
    paragraphs: [],
  },
  {
    id: 'B1L01-R02',
    bookId: 1,
    lessonId: 1,
    dialogueNumber: 2,
    title: '介紹朋友',
    setting: '校園',
    printedPages: [3, 4],
    audioReference: '1-2',
    paragraphs: [],
  },
  {
    id: 'B1L02-R01',
    bookId: 1,
    lessonId: 2,
    dialogueNumber: 1,
    title: '買東西',
    setting: '超市',
    printedPages: [10, 11],
    audioReference: '2-1',
    paragraphs: [],
  },
  {
    id: 'B1L02-R02',
    bookId: 1,
    lessonId: 2,
    dialogueNumber: 2,
    title: '付錢',
    setting: '收銀台',
    printedPages: [12, 13],
    audioReference: '2-2',
    paragraphs: [],
  },
];

test('resolves Part 1 to Dialogue 1 of selected lesson', () => {
  const index = resolveActiveReadingIndex({
    bookId: 1,
    selectedLessons: [1],
    selectedLessonParts: { '1:1': [1] },
    readings: mockReadings,
  });
  assert.equal(index, 0);
  assert.equal(mockReadings[index].id, 'B1L01-R01');
});

test('resolves Part 2 to Dialogue 2 of selected lesson', () => {
  const index = resolveActiveReadingIndex({
    bookId: 1,
    selectedLessons: [1],
    selectedLessonParts: { '1:1': [2] },
    readings: mockReadings,
  });
  assert.equal(index, 1);
  assert.equal(mockReadings[index].id, 'B1L01-R02');
});

test('resolves Part 3 to Dialogue 1 gracefully (Book 1 Part 3 has no dialogues)', () => {
  const index = resolveActiveReadingIndex({
    bookId: 1,
    selectedLessons: [1],
    selectedLessonParts: { '1:1': [3] },
    readings: mockReadings,
  });
  assert.equal(index, 0);
  assert.equal(mockReadings[index].id, 'B1L01-R01');
});

test('resolves Lesson 2 Part 2 correctly', () => {
  const index = resolveActiveReadingIndex({
    bookId: 1,
    selectedLessons: [2],
    selectedLessonParts: { '1:2': [2] },
    readings: mockReadings,
  });
  assert.equal(index, 3);
  assert.equal(mockReadings[index].id, 'B1L02-R02');
});
