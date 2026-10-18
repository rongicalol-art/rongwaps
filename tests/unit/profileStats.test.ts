import assert from 'node:assert/strict';
import test from 'node:test';
import { computeStreak, countKnownCharacters, lessonProgress, topConfusionPairs } from '../../src/utils/srs/profileStats';
const local = (day: number, hour = 12) => +new Date(2026, 9, day, hour);
test('streak stays alive yesterday, deduplicates days and uses Monday week', () => {
  const events = [12, 13, 14, 14].map((day) => ({ reviewedAt: local(day) }));
  assert.deepEqual(computeStreak(events, local(15)), {
    streak: 3, studiedToday: false, todayIndex: 3, week: [true, true, true, false, false, false, false],
  });
  assert.equal(computeStreak(events, local(16)).streak, 0);
  assert.equal(computeStreak([...events, { reviewedAt: local(15, 0) }], local(15)).streak, 4);
  assert.equal(computeStreak([], local(15)).streak, 0);
});
test('future events excluded and Sunday belongs to the ending week', () => {
  const result = computeStreak([{ reviewedAt: local(18, 0) }, { reviewedAt: local(19) }], local(18));
  assert.equal(result.streak, 1);
  assert.equal(result.todayIndex, 6);
  assert.deepEqual(result.week, [false, false, false, false, false, false, true]);
});
test('characters count unique Han, including supplementary characters, in projected form', () => {
  const forms = new Map([['a', '學生，生！'], ['b', '学𠀀 A1']]);
  assert.equal(countKnownCharacters(['a', 'b', 'missing', 'a'], forms), 4);
  assert.equal(countKnownCharacters(['a'], forms), 2);
});
test('lesson progress excludes introduction and unknown ids and deduplicates rows', () => {
  assert.deepEqual(lessonProgress(['B1L00-1', 'B1L01-1', 'B1L01-2', 'B1L02-1', 'B1L02-1', 'custom'].map((id) => ({ id })), ['B1L01-1', 'B1L01-2']), {
    1: { known: 2, total: 2 }, 2: { known: 0, total: 1 },
  });
});
test('confusions deduplicate mirrored pairs, skip self pairs and respect limit', () => {
  assert.deepEqual(topConfusionPairs({ a: ['b'], b: ['a'], c: ['c', 'd', 'e'], d: ['c'] }), [['d', 'c'], ['c', 'e'], ['b', 'a']]);
  assert.deepEqual(topConfusionPairs({ a: ['b'] }, 0), []);
});
