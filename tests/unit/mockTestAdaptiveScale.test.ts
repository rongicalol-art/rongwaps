import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADAPTIVE_LEVELS,
  abilityToScale,
  adaptiveLevel,
  adaptiveOverallLevel,
  levelDifficulty,
  scaleToAbility,
  scoreAdaptiveSkill,
} from '../../src/utils/mockTest/adaptiveScale';

/** The adaptive test's 0-700 scale, its levels and the first guess of a question's difficulty. */

test('the scale matches the official practice test\'s own sittings', () => {
  assert.equal(abilityToScale(2.97218), 650); // Reading, final ability and score seen together.
  assert.equal(abilityToScale(-6.87), 155);
  assert.equal(abilityToScale(0), 500);
  assert.equal(abilityToScale(99), 700);
  assert.equal(abilityToScale(-99), 0);
  assert.equal(scaleToAbility(650), 3);
});

test('a score passes the highest level it reaches, per skill', () => {
  assert.equal(adaptiveLevel('listening', 480)?.label, 'Level 3');
  assert.equal(adaptiveLevel('reading', 480)?.label, 'Level 2');
  assert.equal(adaptiveLevel('listening', 189), null);
  assert.equal(adaptiveLevel('reading', 700)?.label, 'Level 6');
  assert.ok(ADAPTIVE_LEVELS.every((level, index) => index === 0 || level.pass.listening > ADAPTIVE_LEVELS[index - 1].pass.listening));
});

test('a result carries its range, and stops at the pool\'s top level', () => {
  const result = scoreAdaptiveSkill('listening', { ability: 0, error: 0.4 });
  assert.deepEqual([result.low, result.score, result.high], [480, 500, 520]);
  assert.equal(result.level?.label, 'Level 3');
  assert.equal(result.atCeiling, false);
  const capped = scoreAdaptiveSkill('listening', { ability: 2.5, error: 0.4 }, 4);
  assert.equal(capped.level?.label, 'Level 4');
  assert.equal(capped.atCeiling, true);
  assert.equal(scoreAdaptiveSkill('listening', { ability: 1.2, error: 0.4 }, 4).atCeiling, false);
});

test('the overall level is the lower skill\'s', () => {
  const three = adaptiveLevel('listening', 500);
  const two = adaptiveLevel('reading', 460);
  assert.equal(adaptiveOverallLevel(three, two)?.label, 'Level 2');
  assert.equal(adaptiveOverallLevel(three, null), null);
});

test('a level label places a question between that level\'s pass score and the next', () => {
  const start = levelDifficulty('listening', 3, 0);
  const end = levelDifficulty('listening', 3, 1);
  assert.equal(abilityToScale(start), 480);
  assert.equal(abilityToScale(end), 555);
  assert.ok(levelDifficulty('listening', 3) > start && levelDifficulty('listening', 3) < end);
  assert.ok(levelDifficulty('reading', 6, 1) > levelDifficulty('reading', 6, 0));
  assert.throws(() => levelDifficulty('reading', 7));
});
