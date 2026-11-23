import type { LessonTestPart } from '../../types/lessonTest';
import { estimateAbility, type AbilityEstimate, type AdaptiveAnswer } from './adaptive';
import type { MockBand } from './pool';

/**
 * A band test's score, the way the TOCFL gives it: each skill out of 80, nothing taken off for a wrong answer, a
 * blank counts as wrong, and a level is passed at a fixed score.
 *
 * The official papers each print their own table from right answers to the score. Those tables all follow one
 * ability scale, the adaptive test's: score = 10 × ability + a constant per band, kept between 10 and 80 (measured
 * on all 30 official tables, docs/reference/TOCFL.md "How the tests are scored"). So a test of any length and any
 * mix of questions is scored the same way: estimate the ability from the answers and the questions' difficulties,
 * then read the score off that line. `tests/unit/mockTestBandScore.test.ts` checks it against the official tables.
 */

/** score = 10 × ability + this. */
export const BAND_OFFSET: Readonly<Record<MockBand, number>> = { N: 100, A: 70, B: 50, C: 30 };
export const BAND_SCORE_MIN = 10;
export const BAND_SCORE_MAX = 80;

/**
 * The official mock papers' question difficulties (centre and spread on the ability scale), fitted from their
 * score tables. New questions and the lesson tests' questions are placed on the scale from these.
 */
export const BAND_PAPER: Readonly<Record<MockBand, Record<LessonTestPart, { mean: number; spread: number }>>> = {
  N: { listening: { mean: -5.4, spread: 1 }, reading: { mean: -5.05, spread: 1.2 } },
  A: { listening: { mean: -2.8, spread: 1.3 }, reading: { mean: -2.65, spread: 1.2 } },
  B: { listening: { mean: -0.15, spread: 1 }, reading: { mean: -0.1, spread: 1.2 } },
  C: { listening: { mean: 1.7, spread: 0.8 }, reading: { mean: 1.7, spread: 0.65 } },
};

/** How sure the starting guess is: the adaptive test's own wide start, so the answers decide. */
const PRIOR_SD = 2;

export function abilityToBandScore(band: MockBand, ability: number): number {
  return Math.min(BAND_SCORE_MAX, Math.max(BAND_SCORE_MIN, Math.round(10 * ability + BAND_OFFSET[band])));
}

/**
 * Where a question sits on the ability scale from its place in its band: `position` 0 is the band's first lesson
 * and 1 its last, spread evenly so the band's questions have the official paper's centre and spread. The first
 * guess for every question, until real answers show how hard it is.
 */
export function bandDifficulty(band: MockBand, part: LessonTestPart, position: number): number {
  const { mean, spread } = BAND_PAPER[band][part];
  return mean + spread * Math.sqrt(3) * (2 * Math.min(1, Math.max(0, position)) - 1);
}

/** TOCFL levels: 0.5 and 0.9 stand for Novice 1 and Novice 2 (below Level 1), then Levels 1 to 6. */
export interface BandLevel {
  level: number;
  /** Pass score out of 80. */
  pass: Record<LessonTestPart, number>;
  /** Certificate rule (2020): the two skills' sum, with each skill at or above its minimum. */
  total: number;
  minimum?: Record<LessonTestPart, number>;
}

export const BAND_LEVELS: Readonly<Record<MockBand, readonly [BandLevel, BandLevel]>> = {
  N: [
    { level: 0.5, pass: { listening: 38, reading: 39 }, total: 77 },
    { level: 0.9, pass: { listening: 59, reading: 61 }, total: 120 },
  ],
  A: [
    { level: 1, pass: { listening: 41, reading: 42 }, total: 83, minimum: { listening: 37, reading: 38 } },
    { level: 2, pass: { listening: 57, reading: 60 }, total: 120, minimum: { listening: 51, reading: 53 } },
  ],
  B: [
    { level: 3, pass: { listening: 46, reading: 48 }, total: 94, minimum: { listening: 42, reading: 44 } },
    { level: 4, pass: { listening: 61, reading: 64 }, total: 125, minimum: { listening: 53, reading: 56 } },
  ],
  C: [
    { level: 5, pass: { listening: 50, reading: 52 }, total: 102, minimum: { listening: 46, reading: 47 } },
    { level: 6, pass: { listening: 61, reading: 69 }, total: 130, minimum: { listening: 54, reading: 61 } },
  ],
};

export interface BandSkillScore {
  /** Out of 80. */
  score: number;
  /** One standard error either side: the range the answers support (wide on a short test). */
  low: number;
  high: number;
  /** The level this score passes in its band, or null below the band's first level. */
  level: number | null;
  /** The next level up in this band and how many more right answers on this test reach it. */
  next: { level: number; moreRight: number } | null;
}

function bandEstimate(band: MockBand, part: LessonTestPart, answers: readonly AdaptiveAnswer[]): AbilityEstimate {
  return estimateAbility(answers, { priorMean: BAND_PAPER[band][part].mean, priorSd: PRIOR_SD });
}

function levelFor(band: MockBand, part: LessonTestPart, score: number): BandLevel | null {
  const [lower, upper] = BAND_LEVELS[band];
  if (score >= upper.pass[part]) return upper;
  return score >= lower.pass[part] ? lower : null;
}

/**
 * One skill's score from its answers (each with the difficulty of the question it answered). No right answer
 * scores 0, as on the official tables.
 */
export function scoreBandSkill(band: MockBand, part: LessonTestPart, answers: readonly AdaptiveAnswer[]): BandSkillScore {
  const correct = answers.filter((answer) => answer.correct).length;
  const estimate = bandEstimate(band, part, answers);
  const score = correct ? abilityToBandScore(band, estimate.ability) : 0;
  const low = correct ? Math.min(score, abilityToBandScore(band, estimate.ability - estimate.error)) : 0;
  const high = Math.max(score, abilityToBandScore(band, estimate.ability + estimate.error));
  const level = levelFor(band, part, score);
  const [lower, upper] = BAND_LEVELS[band];
  const target = level === upper ? null : level === lower ? upper : lower;
  let next: BandSkillScore['next'] = null;
  if (target) {
    // On this scale a test's score depends only on how many answers are right, not on which ones.
    for (let right = correct + 1; right <= answers.length && !next; right += 1) {
      const more = answers.map((answer, index) => ({ difficulty: answer.difficulty, correct: index < right }));
      if (abilityToBandScore(band, bandEstimate(band, part, more).ability) >= target.pass[part]) next = { level: target.level, moreRight: right - correct };
    }
  }
  return { score, low, high, level: level?.level ?? null, next };
}

/**
 * The level a listening and reading pair earns together, by the certificate rule: the two scores add up to the
 * level's total and each clears its own minimum, so a strong skill can carry a slightly weaker one.
 */
export function bandCertificateLevel(band: MockBand, listening: number, reading: number): number | null {
  const [lower, upper] = BAND_LEVELS[band];
  const earns = (level: BandLevel) => listening + reading >= level.total
    && listening >= (level.minimum?.listening ?? 0) && reading >= (level.minimum?.reading ?? 0);
  if (earns(upper)) return upper.level;
  return earns(lower) ? lower.level : null;
}
