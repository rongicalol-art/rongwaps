import assert from 'node:assert/strict';
import test from 'node:test';
import { bandCertificateLevel, scoreBandSkill } from '../../src/utils/mockTest/bandScore';
import { BAND_SCORE_CURVES } from '../../src/utils/mockTest/bandScoreCurves';

/** A band test's score out of 80, its level and its range, from the official mock papers' tables. */

test('every curve covers its paper, never falls, and ends at 80', () => {
  for (const [band, skills] of Object.entries(BAND_SCORE_CURVES)) {
    for (const [skill, curve] of Object.entries(skills)) {
      const size = band === 'N' ? 25 : 50;
      for (const line of [curve.low, curve.mid, curve.high]) {
        assert.equal(line.length, size + 1, `${band} ${skill}`);
        assert.ok(line.every((value, index) => index === 0 || value >= line[index - 1]));
        assert.equal(line[size], 80);
      }
      assert.ok(curve.mid.every((value, index) => value >= curve.low[index] && value <= curve.high[index]));
    }
  }
});

test('about half right reaches a band\'s lower level and about three quarters its upper level', () => {
  assert.equal(scoreBandSkill('A', 'listening', 25, 50).level?.label, 'Level 1');
  assert.equal(scoreBandSkill('A', 'listening', 39, 50).level?.label, 'Level 2');
  assert.equal(scoreBandSkill('B', 'reading', 26, 50).level?.label, 'Level 3');
  assert.equal(scoreBandSkill('C', 'listening', 42, 50).level?.label, 'Level 6');
  assert.equal(scoreBandSkill('A', 'listening', 15, 50).level, null);
});

test('a wrong answer takes nothing off: the score never falls as right answers rise', () => {
  let before = -1;
  for (let correct = 0; correct <= 50; correct += 1) {
    const { score, low, high } = scoreBandSkill('B', 'listening', correct, 50);
    assert.ok(score >= before && low <= score && high >= score);
    before = score;
  }
  assert.equal(scoreBandSkill('B', 'listening', 0, 50).score, 0);
  assert.equal(scoreBandSkill('B', 'listening', 50, 50).score, 80);
});

test('the next level says how many more right answers it takes', () => {
  const below = scoreBandSkill('A', 'listening', 20, 50);
  assert.equal(below.next?.level.label, 'Level 1');
  assert.equal(scoreBandSkill('A', 'listening', 20 + below.next!.moreRight, 50).level?.label, 'Level 1');
  assert.equal(scoreBandSkill('A', 'listening', 20 + below.next!.moreRight - 1, 50).level, null);
  assert.equal(scoreBandSkill('A', 'listening', 30, 50).next?.level.label, 'Level 2');
  assert.equal(scoreBandSkill('A', 'listening', 50, 50).next, null);
});

test('a short test gives the same score for the same share, with a wider range', () => {
  const full = scoreBandSkill('A', 'reading', 30, 50);
  const quick = scoreBandSkill('A', 'reading', 6, 10);
  assert.equal(quick.score, full.score);
  assert.ok(quick.high - quick.low > full.high - full.low);
  assert.equal(scoreBandSkill('A', 'reading', 0, 0).score, 0);
});

test('a certificate needs the sum and each skill\'s minimum', () => {
  assert.equal(bandCertificateLevel('A', 61, 59)?.label, 'Level 2'); // The exam office's own worked example.
  assert.equal(bandCertificateLevel('A', 70, 50)?.label, 'Level 1'); // The sum is there, reading is under its minimum.
  assert.equal(bandCertificateLevel('A', 40, 40), null);
  assert.equal(bandCertificateLevel('N', 40, 40)?.label, 'Novice 1');
});
