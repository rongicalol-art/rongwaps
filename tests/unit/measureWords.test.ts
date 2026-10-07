import test from 'node:test';
import assert from 'node:assert/strict';
import { splitCourseMeasureWords } from '../../src/utils/vocabulary/measureWords';

test('splitCourseMeasureWords: pulls measure words out of the gloss', () => {
  assert.deepEqual(splitCourseMeasureWords('newspaper (M: 份 fèn)'), {
    meaning: 'newspaper',
    measureWords: [{ char: '份', pinyin: 'fèn' }],
  });
  assert.deepEqual(splitCourseMeasureWords('steak (M: 塊 kuài, 份 fèn, 客 kè)').measureWords.map((m) => m.char), ['塊', '份', '客']);
  assert.equal(
    splitCourseMeasureWords('composition (M: 篇 piān); to write a composition').meaning,
    'composition; to write a composition',
  );
});

test('splitCourseMeasureWords: leaves anything unexpected untouched', () => {
  assert.deepEqual(splitCourseMeasureWords('to know'), { meaning: 'to know', measureWords: [] });
  assert.deepEqual(splitCourseMeasureWords('thing (M: see note)'), { meaning: 'thing (M: see note)', measureWords: [] });
});
