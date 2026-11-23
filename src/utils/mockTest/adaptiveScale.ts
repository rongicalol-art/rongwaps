import type { LessonTestPart } from '../../types/lessonTest';
import type { AbilityEstimate, AdaptiveSettings } from './adaptive';

/**
 * The adaptive test's score scale. The official test reports 0 to 700 per skill; its practice version shows the
 * ability estimate beside the score, and the two follow one line: score = 500 + 50 × ability, to the nearest 5
 * (measured over four sittings, see docs/reference/TOCFL.md). The pass score of each level is published.
 */

export const SCALE_MIN = 0;
export const SCALE_MAX = 700;

export function abilityToScale(ability: number): number {
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.round((500 + 50 * ability) / 5) * 5));
}

export function scaleToAbility(score: number): number {
  return (score - 500) / 50;
}

export interface AdaptiveLevel {
  /** 0.5 and 0.9 stand for Novice 1 and Novice 2, then Levels 1 to 6. */
  level: number;
  label: string;
  pass: Record<LessonTestPart, number>;
}

export const ADAPTIVE_LEVELS: readonly AdaptiveLevel[] = [
  { level: 0.5, label: 'Novice 1', pass: { listening: 190, reading: 195 } },
  { level: 0.9, label: 'Novice 2', pass: { listening: 295, reading: 305 } },
  { level: 1, label: 'Level 1', pass: { listening: 355, reading: 355 } },
  { level: 2, label: 'Level 2', pass: { listening: 435, reading: 450 } },
  { level: 3, label: 'Level 3', pass: { listening: 480, reading: 490 } },
  { level: 4, label: 'Level 4', pass: { listening: 555, reading: 570 } },
  { level: 5, label: 'Level 5', pass: { listening: 600, reading: 610 } },
  { level: 6, label: 'Level 6', pass: { listening: 655, reading: 690 } },
];

/** The official practice test's own settings for the full-length test, and a short version of it. */
export const ADAPTIVE_FULL: Readonly<Record<LessonTestPart, AdaptiveSettings>> = {
  listening: { priorMean: 0.3, priorSd: 2, maxQuestions: 35, minQuestions: 22, stopError: 0.35, shortlist: 4 },
  reading: { priorMean: 0.3, priorSd: 2.5, maxQuestions: 35, minQuestions: 22, stopError: 0.35, shortlist: 4 },
};
export const ADAPTIVE_QUICK: Readonly<Record<LessonTestPart, AdaptiveSettings>> = {
  listening: { ...ADAPTIVE_FULL.listening, maxQuestions: 12, minQuestions: 12 },
  reading: { ...ADAPTIVE_FULL.reading, maxQuestions: 12, minQuestions: 12 },
};

/** "Novice 1", "Level 3": a level's name. */
export function levelLabel(level: number): string {
  return ADAPTIVE_LEVELS.find((entry) => entry.level === level)?.label ?? `Level ${level}`;
}

/** The highest level a score passes in one skill, or null below Novice 1. */
export function adaptiveLevel(part: LessonTestPart, score: number): number | null {
  let passed: number | null = null;
  for (const level of ADAPTIVE_LEVELS) if (score >= level.pass[part]) passed = level.level;
  return passed;
}

export interface AdaptiveSkillScore {
  score: number;
  /** One standard error either side: the range the answers support. */
  low: number;
  high: number;
  level: number | null;
}

export function scoreAdaptiveSkill(part: LessonTestPart, estimate: AbilityEstimate): AdaptiveSkillScore {
  const score = abilityToScale(estimate.ability);
  return {
    score,
    low: abilityToScale(estimate.ability - estimate.error),
    high: abilityToScale(estimate.ability + estimate.error),
    level: adaptiveLevel(part, score),
  };
}
