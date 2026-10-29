import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLessonSentences } from '../../src/screens/sentences/hooks/useLessonSentences';
import type { CourseExampleRecord } from '../../src/types/models';

const record = (id: string, traditional: string): CourseExampleRecord => ({
  id, sourceCardId: '', sourceFront: '', sourceMeaning: '', bookId: 1, lessonId: 1, partId: 1,
  traditional, simplified: traditional, pinyin: '', english: '', sourceOcrId: id,
} as unknown as CourseExampleRecord);

const records = [record('B1L01-R01', '短文句子'), record('B1L01-E01', '例句'), record('B1L01-D01L01', '對話句')];
const part = new Set(['1:1:1']);

test('Sentences defaults to the lessons\' authored examples only', () => {
  assert.deepEqual(buildLessonSentences(records, part).map((item) => item.kind), ['example']);
});

test('Including readings adds the dialogue and Reading sentences in book order', () => {
  assert.deepEqual(buildLessonSentences(records, part, true).map((item) => item.kind), ['dialogue', 'reading', 'example']);
});
