import type { LessonTestPart } from '../../types/lessonTest';
import { BAND_SCORE_CURVES } from './bandScoreCurves';
import type { MockBand } from './pool';

/**
 * A band test's score, the way the TOCFL gives it: right answers become a score out of 80 through a table (nothing
 * is taken off for a wrong answer, a blank counts as wrong), and a level is passed at a fixed score. The official
 * table shifts with each paper's difficulty, so the score comes with the range the official mock papers span.
 * Sources and the numbers' limits: docs/reference/TOCFL.md.
 */

/** TOCFL levels: 0.5 and 0.9 stand for Novice 1 and Novice 2 (below Level 1), then Levels 1 to 6. */
export interface BandLevel {
  level: number;
  label: string;
  /** Pass score out of 80. */
  pass: Record<LessonTestPart, number>;
  /** Certificate rule (2020): the two skills' sum, with each skill at or above its minimum. */
  total: number;
  minimum?: Record<LessonTestPart, number>;
}

export const BAND_LEVELS: Readonly<Record<MockBand, readonly [BandLevel, BandLevel]>> = {
  N: [
    { level: 0.5, label: 'Novice 1', pass: { listening: 38, reading: 39 }, total: 77 },
    { level: 0.9, label: 'Novice 2', pass: { listening: 59, reading: 61 }, total: 120 },
  ],
  A: [
    { level: 1, label: 'Level 1', pass: { listening: 41, reading: 42 }, total: 83, minimum: { listening: 37, reading: 38 } },
    { level: 2, label: 'Level 2', pass: { listening: 57, reading: 60 }, total: 120, minimum: { listening: 51, reading: 53 } },
  ],
  B: [
    { level: 3, label: 'Level 3', pass: { listening: 46, reading: 48 }, total: 94, minimum: { listening: 42, reading: 44 } },
    { level: 4, label: 'Level 4', pass: { listening: 61, reading: 64 }, total: 125, minimum: { listening: 53, reading: 56 } },
  ],
  C: [
    { level: 5, label: 'Level 5', pass: { listening: 50, reading: 52 }, total: 102, minimum: { listening: 46, reading: 47 } },
    { level: 6, label: 'Level 6', pass: { listening: 61, reading: 69 }, total: 130, minimum: { listening: 54, reading: 61 } },
  ],
};

export interface SkillScore {
  /** Out of 80. */
  score: number;
  /** The scores the official papers' tables would give for the same share of right answers. */
  low: number;
  high: number;
  /** The level this score passes in its band, or null below the band's first level. */
  level: BandLevel | null;
  /** The next level up in this band and how many more right answers (of this test's questions) reach it. */
  next: { level: BandLevel; moreRight: number } | null;
}

/** A curve read at a fractional number of right answers. */
function at(curve: readonly number[], rights: number): number {
  const clamped = Math.min(curve.length - 1, Math.max(0, rights));
  const below = Math.floor(clamped);
  const above = Math.min(curve.length - 1, below + 1);
  return curve[below] + (curve[above] - curve[below]) * (clamped - below);
}

function levelFor(band: MockBand, part: LessonTestPart, score: number): BandLevel | null {
  const [lower, upper] = BAND_LEVELS[band];
  if (score >= upper.pass[part]) return upper;
  return score >= lower.pass[part] ? lower : null;
}

/**
 * One skill's score from `correct` of `total` questions. A full paper reads the table directly; a shorter test
 * reads it at the same share of right answers, and its range widens by what a sample of that size can miss.
 */
export function scoreBandSkill(band: MockBand, part: LessonTestPart, correct: number, total: number): SkillScore {
  const curve = BAND_SCORE_CURVES[band][part];
  const full = curve.mid.length - 1;
  const share = total > 0 ? correct / total : 0;
  // What answering only `total` of the paper's `full` questions leaves uncertain (none on a full paper).
  const sample = total > 0 && total < full ? Math.sqrt((share * (1 - share)) / total * ((full - total) / (full - 1))) : 0;
  const score = Math.round(at(curve.mid, share * full));
  const low = Math.min(score, Math.round(at(curve.low, (share - sample) * full)));
  const high = Math.max(score, Math.round(at(curve.high, (share + sample) * full)));
  const level = levelFor(band, part, score);
  const [lower, upper] = BAND_LEVELS[band];
  const target = level === upper ? null : level === lower ? upper : lower;
  let next: SkillScore['next'] = null;
  if (target) {
    let needed = correct;
    while (needed < total && Math.round(at(curve.mid, (needed / total) * full)) < target.pass[part]) needed += 1;
    next = { level: target, moreRight: needed - correct };
  }
  return { score, low, high, level, next };
}

/**
 * The level a listening and reading pair earns together, by the certificate rule: the two scores add up to the
 * level's total and each clears its own minimum, so a strong skill can carry a slightly weaker one.
 */
export function bandCertificateLevel(band: MockBand, listening: number, reading: number): BandLevel | null {
  const [lower, upper] = BAND_LEVELS[band];
  const earns = (level: BandLevel) => listening + reading >= level.total
    && listening >= (level.minimum?.listening ?? 0) && reading >= (level.minimum?.reading ?? 0);
  if (earns(upper)) return upper;
  return earns(lower) ? lower : null;
}
