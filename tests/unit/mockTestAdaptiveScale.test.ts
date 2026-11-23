import assert from 'node:assert/strict';
import test from 'node:test';
import { ADAPTIVE_LEVELS, abilityToScale, adaptiveLevel, levelLabel, scaleToAbility, scoreAdaptiveSkill } from '../../src/utils/mockTest/adaptiveScale';

/** The adaptive test's 0-700 scale and its levels. */

test('the scale matches the official practice test\'s own sittings', () => {
  assert.equal(abilityToScale(2.97218), 650); // Reading, final ability and score seen together.
  assert.equal(abilityToScale(-6.87), 155);
  assert.equal(abilityToScale(0), 500);
  assert.equal(abilityToScale(99), 700);
  assert.equal(abilityToScale(-99), 0);
  assert.equal(scaleToAbility(650), 3);
});

test('a score passes the highest level it reaches, per skill', () => {
  assert.equal(adaptiveLevel('listening', 480), 3);
  assert.equal(adaptiveLevel('reading', 480), 2);
  assert.equal(adaptiveLevel('listening', 189), null);
  assert.equal(adaptiveLevel('reading', 700), 6);
  assert.equal(adaptiveLevel('listening', 200), 0.5);
  assert.ok(ADAPTIVE_LEVELS.every((level, index) => index === 0 || level.pass.listening > ADAPTIVE_LEVELS[index - 1].pass.listening));
  assert.deepEqual([levelLabel(0.5), levelLabel(0.9), levelLabel(4)], ['Novice 1', 'Novice 2', 'Level 4']);
});

test('a result carries its range', () => {
  const result = scoreAdaptiveSkill('listening', { ability: 0, error: 0.4 });
  assert.deepEqual([result.low, result.score, result.high, result.level], [480, 500, 520, 3]);
});
