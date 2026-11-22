/**
 * The adaptive test's maths, as the official TOCFL computerized adaptive test runs it (docs/reference/TOCFL.md):
 * a one-parameter (Rasch) model, where a question's difficulty and a learner's ability share one scale and the
 * chance of a right answer depends only on the gap between them. After every answer the ability is estimated
 * again, and the next question is one whose difficulty is close to it. Pure and seeded, so a run is reproducible.
 *
 * Ability is the mean of what the answers so far allow (expected a posteriori), starting from a wide bell
 * around `priorMean`. It works from the first answer, including all right or all wrong, where the usual
 * "most likely ability" has no finite answer.
 */

export interface AdaptiveSettings {
  /** Where the estimate starts, and how sure that start is (a larger spread lets early answers move it more). */
  priorMean: number;
  priorSd: number;
  /** The test stops at `maxQuestions`, or after `minQuestions` once the estimate's error is at most `stopError`. */
  maxQuestions: number;
  minQuestions: number;
  stopError: number;
  /** The next question is drawn from this many best fits, so two learners at one level don't get the same test. */
  shortlist: number;
}

/** One scored answer: the difficulty of the question it answered. */
export interface AdaptiveAnswer {
  difficulty: number;
  correct: boolean;
}

/** Something the test can ask next: one question, or a recording or text whose questions are answered together. */
export interface AdaptiveCandidate {
  id: string;
  difficulty: number;
  questions: number;
  /** Times this learner has seen it before; seen ones are held back while unseen ones fit. */
  seen?: number;
}

export interface AbilityEstimate {
  ability: number;
  /** The estimate's standard error: the spread of abilities the answers still allow. */
  error: number;
}

const GRID_MIN = -8;
const GRID_MAX = 8;
const GRID_STEP = 0.05;
/** How far (in difficulty units) one earlier showing pushes a question down the list. */
const SEEN_PENALTY = 0.75;

/** The chance that a learner of this ability answers a question of this difficulty right. */
export function chanceRight(ability: number, difficulty: number): number {
  return 1 / (1 + Math.exp(difficulty - ability));
}

export function estimateAbility(
  answers: readonly AdaptiveAnswer[],
  settings: Pick<AdaptiveSettings, 'priorMean' | 'priorSd'>,
): AbilityEstimate {
  let total = 0;
  let mean = 0;
  let square = 0;
  for (let ability = GRID_MIN; ability <= GRID_MAX + 1e-9; ability += GRID_STEP) {
    const z = (ability - settings.priorMean) / settings.priorSd;
    // Log weights, so a long run of answers cannot underflow to zero.
    let log = -0.5 * z * z;
    for (const answer of answers) {
      const p = chanceRight(ability, answer.difficulty);
      log += Math.log(answer.correct ? p : 1 - p);
    }
    const weight = Math.exp(log);
    total += weight;
    mean += weight * ability;
    square += weight * ability * ability;
  }
  if (!(total > 0)) return { ability: settings.priorMean, error: settings.priorSd };
  const ability = mean / total;
  return { ability, error: Math.sqrt(Math.max(0, square / total - ability * ability)) };
}

/** Whether the test is over: the question limit, or enough questions with a sure enough estimate. */
export function adaptiveTestDone(asked: number, error: number, settings: AdaptiveSettings): boolean {
  if (asked >= settings.maxQuestions) return true;
  return asked >= settings.minQuestions && error <= settings.stopError;
}

/**
 * The next thing to ask: among those not yet used in this run, one of the `shortlist` whose difficulty sits
 * closest to the current ability (a Rasch question tells the most there), unseen ones first. Null when the pool
 * has nothing left.
 */
export function pickAdaptiveNext<T extends AdaptiveCandidate>(
  candidates: readonly T[],
  used: ReadonlySet<string>,
  ability: number,
  settings: Pick<AdaptiveSettings, 'shortlist'>,
  rng: () => number,
): T | null {
  const ranked = candidates
    .filter((candidate) => !used.has(candidate.id))
    .map((candidate) => ({ candidate, distance: Math.abs(candidate.difficulty - ability) + SEEN_PENALTY * (candidate.seen ?? 0) }))
    .sort((a, b) => a.distance - b.distance || (a.candidate.id < b.candidate.id ? -1 : 1));
  if (!ranked.length) return null;
  const shortlist = ranked.slice(0, Math.max(1, settings.shortlist));
  return shortlist[Math.floor(rng() * shortlist.length)].candidate;
}
