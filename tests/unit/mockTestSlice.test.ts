import assert from 'node:assert/strict';
import test from 'node:test';
import { MOCK_TEST_HISTORY, mergeMockTests, mockTestRecord, type MockTestRecord } from '../../src/store/slices/mockTestSlice';

/** Mock test results as they are saved and merged between a learner's devices. */

const record = (at: string, level: number | null = 2): MockTestRecord => ({
  at, kind: 'A', parts: ['listening', 'reading'], length: 'quick', scale: 80, listening: [60, 8, 10], reading: [58, 7, 10], level, floor: 1, atCeiling: false,
});

test('a result is saved as one small record', () => {
  const saved = mockTestRecord(
    { kind: 'adaptive', parts: ['listening'], length: 'full' },
    { scale: 700, skills: { listening: { correct: 20, total: 35, score: 485, low: 470, high: 500, level: 3 } }, level: 3, floor: 0.5, atCeiling: true },
    '2026-11-23T10:00:00.000Z',
  );
  assert.deepEqual(saved, { at: '2026-11-23T10:00:00.000Z', kind: 'adaptive', parts: ['listening'], length: 'full', scale: 700, listening: [485, 20, 35], level: 3, floor: 0.5, atCeiling: true });
});

test('another device\'s results join this one\'s, newest first, each once', () => {
  const local = [record('2026-11-22T10:00:00.000Z'), record('2026-11-20T10:00:00.000Z')];
  const cloud = [record('2026-11-23T10:00:00.000Z', null), record('2026-11-20T10:00:00.000Z'), record('2026-11-21T10:00:00.000Z')];
  const merged = mergeMockTests(local, cloud).mockTests!;
  assert.deepEqual(merged.map((entry) => entry.at.slice(8, 10)), ['23', '22', '21', '20']);
  assert.equal(merged[0].level, null);
  assert.deepEqual(mergeMockTests(merged, cloud), {});
});

test('what is not a result is left out, and the history keeps its length', () => {
  const local = [record('2026-11-22T10:00:00.000Z')];
  const junk = [null, 'x', { at: 'never' }, { ...record('2026-11-23T10:00:00.000Z'), kind: 'Z' }, { ...record('2026-11-23T11:00:00.000Z'), listening: [1, 2] }, { ...record('2026-11-23T12:00:00.000Z'), scale: 100 }];
  assert.deepEqual(mergeMockTests(local, junk), {});
  assert.deepEqual(mergeMockTests(local, { not: 'a list' }), {});
  const many = Array.from({ length: MOCK_TEST_HISTORY + 5 }, (_, index) => record(new Date(Date.UTC(2026, 0, 1 + index)).toISOString()));
  const merged = mergeMockTests(local, many).mockTests!;
  assert.equal(merged.length, MOCK_TEST_HISTORY);
  assert.equal(merged[0].at, local[0].at);
});
