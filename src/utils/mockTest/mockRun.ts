import type { LessonTestPart } from '../../types/lessonTest';
import { LESSON_TEST_PARTS, createItemPlanner, type LessonTestPlan } from '../lesson/lessonTestPlan';
import { createQuizRng } from '../vocabulary/quizDirector';
import { adaptiveTestDone, estimateAbility, pickAdaptiveNext, type AdaptiveAnswer, type AdaptiveSettings } from './adaptive';
import { ADAPTIVE_FULL, ADAPTIVE_QUICK, ADAPTIVE_LEVELS, scoreAdaptiveSkill } from './adaptiveScale';
import { BAND_LEVELS, bandCertificateLevel, scoreBandSkill } from './bandScore';
import { planPoolTest, type PoolEntry } from './pool';
import { mockRecipe, type MockLength, type RecipeBand } from './recipes';

/**
 * One mock test from start to score. The learner picks three things: the kind (the adaptive test, or a band's
 * fixed paper), the skills and the length. A fixed paper is planned whole from its recipe; the adaptive test grows
 * one question at a time from the answers so far. Both run on the lesson test's plan, screens and scorer.
 */

export type MockKind = 'adaptive' | RecipeBand;

export interface MockConfig {
  kind: MockKind;
  /** In test order: listening before reading. */
  parts: LessonTestPart[];
  length: MockLength;
}

export const mockConfigKey = (config: MockConfig) => `${config.kind}:${config.parts.join('+')}:${config.length}`;

const orderedParts = (config: MockConfig) => LESSON_TEST_PARTS.map((entry) => entry.part).filter((part) => config.parts.includes(part));

function adaptiveSettings(config: MockConfig, part: LessonTestPart, startAbility: number | undefined): AdaptiveSettings {
  const settings = (config.length === 'quick' ? ADAPTIVE_QUICK : ADAPTIVE_FULL)[part];
  return startAbility === undefined ? settings : { ...settings, priorMean: startAbility };
}

/** A skill's answers so far, each with its question's difficulty. A question shown and left blank is a wrong answer. */
function skillAnswers(byId: ReadonlyMap<string, PoolEntry>, plan: LessonTestPlan, answers: Record<string, number>, part: LessonTestPart): AdaptiveAnswer[] {
  return plan.items.filter((planned) => planned.part === part).flatMap((planned) => {
    const entry = byId.get(planned.itemId);
    return entry ? entry.item.questions.map((question) => ({ difficulty: entry.difficulty, correct: answers[question.id] === question.key })) : [];
  });
}

export function poolEntryIndex(pool: readonly PoolEntry[]): Map<string, PoolEntry> {
  return new Map(pool.map((entry) => [entry.item.id, entry] as const));
}

/**
 * The adaptive test's next step, called once every planned question is answered: the plan with one more recording
 * or text (chosen near the current estimate, from questions and families not yet used), or `done` when every skill
 * has reached its limit or the pool has nothing left to ask.
 */
export function extendAdaptivePlan(
  pool: readonly PoolEntry[],
  config: MockConfig,
  plan: LessonTestPlan,
  answers: Record<string, number>,
  seen: Record<string, number>,
  startAbility?: number,
): { plan: LessonTestPlan; done: boolean } {
  const byId = poolEntryIndex(pool);
  const usedFamilies = new Set(plan.items.map((planned) => byId.get(planned.itemId)?.family));
  for (const part of orderedParts(config)) {
    const settings = adaptiveSettings(config, part, startAbility);
    const given = skillAnswers(byId, plan, answers, part);
    const estimate = estimateAbility(given, settings);
    if (adaptiveTestDone(given.length, estimate.error, settings)) continue;
    const candidates = pool
      .filter((entry) => entry.part === part && !usedFamilies.has(entry.family))
      .map((entry) => ({ id: entry.item.id, difficulty: entry.difficulty, questions: entry.item.questions.length, seen: seen[entry.item.id], family: entry.family }));
    const rng = createQuizRng(`${plan.key}:${plan.seed}:${plan.items.length}`);
    const next = pickAdaptiveNext(candidates, new Set<string>(), estimate.ability, settings, rng);
    const entry = next && byId.get(next.id);
    if (!entry) continue;
    return { plan: { ...plan, items: [...plan.items, createItemPlanner(rng)(entry.section, part, entry.item)] }, done: false };
  }
  return { plan, done: true };
}

/** A new run's plan: a fixed paper whole, or the adaptive test's first question. */
export function startMockPlan(pool: readonly PoolEntry[], config: MockConfig, seen: Record<string, number>, seed: string, startAbility?: number): LessonTestPlan {
  if (config.kind === 'adaptive') {
    return extendAdaptivePlan(pool, config, { key: mockConfigKey(config), seed, items: [] }, {}, seen, startAbility).plan;
  }
  const { key, items } = planPoolTest(pool, mockRecipe(config.kind, config.length), config.parts, seen, seed);
  return { key, seed, items };
}

export interface MockSkillResult {
  correct: number;
  total: number;
  /** Out of 80 (band test) or 0 to 700 (adaptive test). */
  score: number;
  low: number;
  high: number;
  /** The level passed (0.5 and 0.9 are Novice 1 and 2), or null below the test's first level. */
  level: number | null;
}

export interface MockResult {
  /** The top of the score scale: 80 or 700. */
  scale: 80 | 700;
  skills: Partial<Record<LessonTestPart, MockSkillResult>>;
  /** The level the test as a whole gives, or null below its first level. */
  level: number | null;
  /** The lowest level this test can give: "below Level 1" when `level` is null. */
  floor: number;
  /** True when the answers reach past the hardest questions the pool has: the level is "this or above". */
  atCeiling: boolean;
}

/** The highest level the pool has questions for in each of these skills (the lower one, when two are tested). */
export function poolCeiling(pool: readonly PoolEntry[], parts: readonly LessonTestPart[], band?: RecipeBand): number {
  return Math.min(...parts.map((part) => Math.max(0, ...pool.filter((entry) => entry.part === part && (!band || entry.band === band)).map((entry) => entry.level))));
}

/**
 * A finished (or abandoned) run's result. A band test gives each skill out of 80 and its level by the pass score,
 * and both skills together by the certificate rule; the adaptive test gives 0 to 700 per skill and the lower skill's
 * level. A level above the pool's hardest questions cannot be told apart, so the level stops there and is marked.
 * A skill with no right answer scores 0 and earns no level.
 */
export function scoreMockTest(pool: readonly PoolEntry[], config: MockConfig, plan: LessonTestPlan, answers: Record<string, number>, startAbility?: number): MockResult {
  const byId = poolEntryIndex(pool);
  const parts = orderedParts(config);
  const skills: MockResult['skills'] = {};
  for (const part of parts) {
    const given = skillAnswers(byId, plan, answers, part);
    const counts = { correct: given.filter((answer) => answer.correct).length, total: given.length };
    if (config.kind === 'adaptive') {
      const settings = adaptiveSettings(config, part, startAbility);
      // A skill cut short (the clock ran out) owes questions: they count as asked at the level reached and missed,
      // as a blank does. Otherwise a few answers and the starting guess would decide the score.
      const owed = Math.max(0, settings.minQuestions - given.length);
      const reached = estimateAbility(given, settings).ability;
      const scored = owed ? [...given, ...Array.from({ length: owed }, () => ({ difficulty: reached, correct: false }))] : given;
      const { score, low, high, level } = scoreAdaptiveSkill(part, estimateAbility(scored, settings));
      // No right answer earns no level, as on a band test.
      skills[part] = counts.correct ? { ...counts, score, low, high, level } : { ...counts, score: 0, low: 0, high: 0, level: null };
    } else {
      const { score, low, high, level } = scoreBandSkill(config.kind, part, given);
      skills[part] = { ...counts, score, low, high, level };
    }
  }
  const levels = parts.map((part) => skills[part]!.level);
  let level: number | null;
  if (config.kind !== 'adaptive' && parts.length === 2) level = bandCertificateLevel(config.kind, skills.listening!.score, skills.reading!.score);
  else level = levels.some((entry) => entry === null) ? null : Math.min(...(levels as number[]));
  const ceiling = poolCeiling(pool, parts, config.kind === 'adaptive' ? undefined : config.kind);
  const atCeiling = level !== null && level > ceiling;
  return {
    scale: config.kind === 'adaptive' ? 700 : 80,
    skills,
    level: atCeiling ? ceiling : level,
    floor: config.kind === 'adaptive' ? ADAPTIVE_LEVELS[0].level : BAND_LEVELS[config.kind][0].level,
    atCeiling,
  };
}
