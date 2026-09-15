import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveActiveReadingIndex, findReadingIndexForPart } from '../src/utils/readingContext';
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

test('resolves Part 3 to Dialogue 1 gracefully when Part 3 dialogue is absent', () => {
  const index = resolveActiveReadingIndex({
    bookId: 1,
    selectedLessons: [1],
    selectedLessonParts: { '1:1': [3] },
    readings: mockReadings,
  });
  assert.equal(index, 0);
  assert.equal(mockReadings[index].id, 'B1L01-R01');
});

test('resolves Part 3 to Dialogue 3 when present', () => {
  const readingsWithPart3: ReadingRecord[] = [
    ...mockReadings,
    {
      id: 'B1L01-R03',
      bookId: 1,
      lessonId: 1,
      dialogueNumber: 3,
      title: '短文',
      setting: '教室',
      printedPages: [47, 48],
      audioReference: '1-3',
      paragraphs: [],
    },
  ];
  const index = resolveActiveReadingIndex({
    bookId: 1,
    selectedLessons: [1],
    selectedLessonParts: { '1:1': [3] },
    readings: readingsWithPart3,
  });
  assert.equal(index, 4);
  assert.equal(readingsWithPart3[index].id, 'B1L01-R03');
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

test('findReadingIndexForPart maps Part 1 to Dialogue 1', () => {
  const idx = findReadingIndexForPart(mockReadings, 1, 1, 1);
  assert.equal(idx, 0);
  assert.equal(mockReadings[idx].id, 'B1L01-R01');
});

test('findReadingIndexForPart maps Part 2 to Dialogue 2', () => {
  const idx = findReadingIndexForPart(mockReadings, 1, 1, 2);
  assert.equal(idx, 1);
  assert.equal(mockReadings[idx].id, 'B1L01-R02');
});

test('findReadingIndexForPart maps Part 3 to Dialogue 3 with fallback if absent', () => {
  // Absent dialogue 3 in mockReadings -> falls back to lesson dialogue 1
  const idx = findReadingIndexForPart(mockReadings, 1, 1, 3);
  assert.equal(idx, 0);
  assert.equal(mockReadings[idx].id, 'B1L01-R01');
});

test('findReadingIndexForPart maps Part 3 to Dialogue 3 when present', () => {
  const readingsWithPart3: ReadingRecord[] = [
    ...mockReadings,
    {
      id: 'B1L01-R03',
      bookId: 1,
      lessonId: 1,
      dialogueNumber: 3,
      title: '短文',
      setting: '教室',
      printedPages: [47, 48],
      audioReference: '1-3',
      paragraphs: [],
    },
  ];
  const idx = findReadingIndexForPart(readingsWithPart3, 1, 1, 3);
  assert.equal(idx, 4);
  assert.equal(readingsWithPart3[idx].id, 'B1L01-R03');
});

test('getCharacterForSpeaker identifies all curriculum dialogue participants to prevent vocab pollution', async () => {
  const { getCharacterForSpeaker } = await import('../src/utils/speakerCharacters');
  const names = ['李中明', '中明', '王宜文', '宜文', '小林友美', '友美', '馬國安', '國安', '陳元真', '元真', '高家樂', '家樂', '媽媽', '老師'];
  for (const name of names) {
    const char = getCharacterForSpeaker(name);
    assert.ok(char !== null, `Expected speaker character for ${name}`);
  }

  // Non-speaker words should return null
  assert.equal(getCharacterForSpeaker('圖書館'), null);
  assert.equal(getCharacterForSpeaker('學校'), null);
  assert.equal(getCharacterForSpeaker('台灣'), null);
});

