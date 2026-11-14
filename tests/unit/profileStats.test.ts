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
test('days the app was down (14 to 16 Nov 2026) do not break a streak, and are not counted', () => {
  const november = (day: number) => ({ reviewedAt: +new Date(2026, 10, day, 12) });
  const before = [11, 12, 13].map(november);
  assert.equal(computeStreak(before, +new Date(2026, 10, 15, 12)).streak, 3, 'still alive during the outage');
  assert.equal(computeStreak(before, +new Date(2026, 10, 17, 12)).streak, 3, 'the first day back is theirs to study');
  assert.equal(computeStreak([...before, november(17)], +new Date(2026, 10, 17, 12)).streak, 4, 'continues, without the missed days');
  assert.equal(computeStreak([...before, november(15), november(17)], +new Date(2026, 10, 17, 12)).streak, 5, 'studying offline that day still counts');
  assert.equal(computeStreak(before, +new Date(2026, 10, 18, 12)).streak, 0, 'a missed day after the app was back ends it');
  assert.equal(computeStreak([10, 11].map(november), +new Date(2026, 10, 17, 12)).streak, 0, 'a streak already broken before the outage stays broken');
  assert.equal(computeStreak([], +new Date(2026, 10, 15, 12)).streak, 0);
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
