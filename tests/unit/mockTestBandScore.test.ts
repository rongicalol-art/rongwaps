import assert from 'node:assert/strict';
import test from 'node:test';
import { BAND_SCORE_CURVES } from '../fixtures/officialBandScoreTables';
import type { AdaptiveAnswer } from '../../src/utils/mockTest/adaptive';
import { abilityToScale, ADAPTIVE_LEVELS, scaleToAbility } from '../../src/utils/mockTest/adaptiveScale';
import { BAND_LEVELS, BAND_PAPER, abilityToBandScore, bandCertificateLevel, bandDifficulty, scoreBandSkill } from '../../src/utils/mockTest/bandScore';
import type { MockBand } from '../../src/utils/mockTest/pool';

/** A band test's score out of 80 and its level, checked against the official mock papers' own tables. */

const BANDS: MockBand[] = ['N', 'A', 'B', 'C'];
const SKILLS = ['listening', 'reading'] as const;

/** A paper like the official one: `size` questions spread evenly with the band's measured centre and spread. */
const paper = (band: MockBand, skill: (typeof SKILLS)[number], size: number) => Array.from({ length: size }, (_, i) => bandDifficulty(band, skill, (i + 0.5) / size));
const answersFor = (difficulties: number[], right: number): AdaptiveAnswer[] => difficulties.map((difficulty, index) => ({ difficulty, correct: index < right }));

test('the band scale and the adaptive scale are one: each level\'s two pass scores meet', () => {
  for (const band of BANDS) {
    for (const level of BAND_LEVELS[band]) {
      for (const skill of SKILLS) {
        const adaptivePass = ADAPTIVE_LEVELS.find((entry) => entry.level === level.level)!.pass[skill];
        const asBand = abilityToBandScore(band, scaleToAbility(adaptivePass));
        assert.ok(Math.abs(asBand - level.pass[skill]) <= 1, `${band} level ${level.level} ${skill}: ${asBand} vs ${level.pass[skill]}`);
      }
    }
  }
  assert.equal(abilityToScale(scaleToAbility(480)), 480);
});

test('a paper shaped like the official ones scores as the official tables do', () => {
  for (const band of BANDS) {
    for (const skill of SKILLS) {
      const curve = BAND_SCORE_CURVES[band][skill];
      const size = curve.mid.length - 1;
      const difficulties = paper(band, skill, size);
      let worst = 0;
      // The middle of the table; the ends are flattened by hand on the official tables.
      for (let right = Math.round(size * 0.15); right <= Math.round(size * 0.85); right += 1) {
        const { score } = scoreBandSkill(band, skill, answersFor(difficulties, right));
        const gap = score < curve.low[right] ? curve.low[right] - score : score > curve.high[right] ? score - curve.high[right] : 0;
        worst = Math.max(worst, gap);
      }
      assert.ok(worst <= 2, `${band} ${skill}: ${worst} points outside the official papers' range`);
    }
  }
});

test('about half right reaches a band\'s lower level and about three quarters its upper level', () => {
  const level = (band: MockBand, skill: (typeof SKILLS)[number], right: number) => scoreBandSkill(band, skill, answersFor(paper(band, skill, 50), right)).level;
  assert.equal(level('A', 'listening', 26), 1);
  assert.equal(level('A', 'listening', 40), 2);
  assert.equal(level('B', 'reading', 27), 3);
  assert.equal(level('C', 'listening', 43), 6);
  assert.equal(level('A', 'listening', 15), null);
});

test('a wrong answer takes nothing off: the score never falls as right answers rise', () => {
  const difficulties = paper('B', 'listening', 50);
  let before = -1;
  for (let right = 0; right <= 50; right += 1) {
    const { score, low, high } = scoreBandSkill('B', 'listening', answersFor(difficulties, right));
    assert.ok(score >= before && low <= score && high >= score);
    before = score;
  }
  assert.equal(scoreBandSkill('B', 'listening', answersFor(difficulties, 0)).score, 0);
  assert.equal(scoreBandSkill('B', 'listening', answersFor(difficulties, 50)).score, 80);
});

test('which answers are right does not matter, only how many', () => {
  const difficulties = paper('A', 'reading', 20);
  const easyRight = scoreBandSkill('A', 'reading', difficulties.map((difficulty, index) => ({ difficulty, correct: index < 10 })));
  const hardRight = scoreBandSkill('A', 'reading', difficulties.map((difficulty, index) => ({ difficulty, correct: index >= 10 })));
  assert.equal(easyRight.score, hardRight.score);
});

test('harder questions earn a higher score for the same number right', () => {
  const easy = scoreBandSkill('B', 'listening', answersFor(Array.from({ length: 20 }, () => BAND_PAPER.B.listening.mean - 1.5), 12));
  const hard = scoreBandSkill('B', 'listening', answersFor(Array.from({ length: 20 }, () => BAND_PAPER.B.listening.mean + 1.5), 12));
  assert.ok(hard.score > easy.score + 15);
});

test('the next level says how many more right answers it takes', () => {
  const difficulties = paper('A', 'listening', 50);
  const below = scoreBandSkill('A', 'listening', answersFor(difficulties, 18));
  assert.equal(below.level, null);
  assert.equal(below.next?.level, 1);
  assert.equal(scoreBandSkill('A', 'listening', answersFor(difficulties, 18 + below.next!.moreRight)).level, 1);
  assert.equal(scoreBandSkill('A', 'listening', answersFor(difficulties, 18 + below.next!.moreRight - 1)).level, null);
  assert.equal(scoreBandSkill('A', 'listening', answersFor(difficulties, 30)).next?.level, 2);
  assert.equal(scoreBandSkill('A', 'listening', answersFor(difficulties, 50)).next, null);
});

test('a short test gives about the same score for the same share, with a wider range', () => {
  const full = scoreBandSkill('A', 'reading', answersFor(paper('A', 'reading', 50), 30));
  const quick = scoreBandSkill('A', 'reading', answersFor(paper('A', 'reading', 10), 6));
  assert.ok(Math.abs(quick.score - full.score) <= 3, `${quick.score} vs ${full.score}`);
  assert.ok(quick.high - quick.low > full.high - full.low);
  assert.equal(scoreBandSkill('A', 'reading', []).score, 0);
});

test('a certificate needs the sum and each skill\'s minimum', () => {
  assert.equal(bandCertificateLevel('A', 61, 59), 2); // The exam office's own worked example.
  assert.equal(bandCertificateLevel('A', 70, 50), 1); // The sum is there, reading is under its minimum.
  assert.equal(bandCertificateLevel('A', 40, 40), null);
  assert.equal(bandCertificateLevel('N', 40, 40), 0.5);
});
