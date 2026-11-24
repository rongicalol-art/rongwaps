import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flagTestQuestions, loadTestQuestions } from '../../scripts/release/testQuestionStats.mjs';

const question = (key: number) => ({ lesson: 'b3l10', edition: 'abcd1234', key, prompt: '男的為什麼？', choices: ['A', 'B', 'C', 'D'] });

/** One row per pick: n runs whose rest scores were all `score`. */
const row = (q: string, pick: number, n: number, score: number, e = 'abcd1234') => ({ q, e, pick, n, s1: n * score, s2: n * score * score });

test('a healthy question (strong runs get it right, weak ones miss) is not flagged', () => {
  const rows = [row('good', 1, 30, 0.85), row('good', 0, 10, 0.45), row('good', 2, 5, 0.4)];
  assert.deepEqual(flagTestQuestions(rows, new Map([['good', question(1)]])), []);
});

test('a wrong choice picked more than the key is flagged first, with its share', () => {
  const rows = [row('miskey', 2, 20, 0.8), row('miskey', 0, 25, 0.8), row('weak', 1, 40, 0.7), row('weak', 0, 10, 0.7)];
  const flagged = flagTestQuestions(rows, new Map([['miskey', question(2)], ['weak', question(1)]]));
  assert.equal(flagged[0].id, 'miskey');
  assert.ok(flagged[0].reasons.includes('a wrong choice is picked more than the key'));
  assert.equal(flagged[0].topWrong?.choice, 'A');
  assert.equal(Math.round((flagged[0].topWrong?.share ?? 0) * 100), 56);
});

test('strong runs missing it more than weak ones gives a negative discrimination', () => {
  const rows = [row('trap', 0, 20, 0.5), row('trap', 3, 20, 0.9)];
  const [flag] = flagTestQuestions(rows, new Map([['trap', question(0)]]));
  assert.ok(flag.discrimination !== null && flag.discrimination < 0);
  assert.ok(flag.reasons.includes('strong runs miss it more than weak ones'));
});

test('questions under 30 answers, or no longer in the packs, are left out; blanks count as wrong', () => {
  const few = [row('few', 0, 10, 0.5), row('few', 1, 15, 0.9)];
  const gone = [row('gone', 0, 50, 0.5)];
  const blank = [row('blank', 1, 5, 0.9), row('blank', -1, 30, 0.4)];
  const flagged = flagTestQuestions([...few, ...gone, ...blank], new Map([['few', question(1)], ['blank', question(1)]]));
  assert.deepEqual(flagged.map((f) => f.id), ['blank']);
  assert.ok(flagged[0].reasons.includes('few get it right'));
  assert.equal(flagged[0].topWrong, null);
});

test('counts from an older edition of the question are left out', () => {
  const rows = [row('edited', 2, 40, 0.8, '00000000'), row('edited', 0, 50, 0.8, '00000000')];
  assert.deepEqual(flagTestQuestions(rows, new Map([['edited', question(2)]])), []);
});

test('the shipped packs give every question its key, choices and edition', () => {
  const questions = loadTestQuestions();
  const sample = questions.get('b3l10-dialogue-just-that-1-q');
  assert.ok(questions.size > 1000);
  assert.equal(sample?.lesson, 'b3l10');
  assert.equal(sample?.key, 1);
  assert.equal(sample?.choices.length, 4);
  assert.match(sample?.edition ?? '', /^[0-9a-f]{8}$/);
});
