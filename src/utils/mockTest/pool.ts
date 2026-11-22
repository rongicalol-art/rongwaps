import type { LessonTestItem, LessonTestPart } from '../../types/lessonTest';
import { createItemPlanner, type LessonTestPlan, type PlannedItem } from '../lesson/lessonTestPlan';
import { createQuizRng, type QuizRng } from '../vocabulary/quizDirector';

/**
 * The mock test's question pool. Every question the app has (lesson tests and ones written for the mock test)
 * is one entry with three labels: its band, its section of the official paper and its level. A fixed test is a
 * recipe: so many questions from each section. Adding questions to the pool needs no code change.
 */

/** N = Novice (準備級), then the three official bands. */
export type MockBand = 'N' | 'A' | 'B' | 'C';

export interface PoolEntry {
  item: LessonTestItem;
  part: LessonTestPart;
  band: MockBand;
  /** The section of the official paper this question's shape belongs to, e.g. "A-L2" (Band A, listening part 2). */
  section: string;
  /** TOCFL level 0 (Novice) to 6. */
  level: number;
  /** Where it sits on the adaptive test's ability scale. */
  difficulty: number;
}

export interface RecipeLine {
  section: string;
  /** Questions to draw from this section (a recording or text with several questions counts each of them). */
  questions: number;
}

export interface MockRecipe {
  key: string;
  band: MockBand;
  lines: RecipeLine[];
}

function shuffled<T>(values: readonly T[], rng: QuizRng): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Fills one recipe line: least-seen questions first, in a random order among equals, never past the line's
 * question count (a group that would overshoot is skipped for a smaller one).
 */
function drawSection(entries: readonly PoolEntry[], wanted: number, seen: Record<string, number>, rng: QuizRng): PoolEntry[] {
  const order = shuffled(entries, rng).sort((a, b) => (seen[a.item.id] ?? 0) - (seen[b.item.id] ?? 0));
  const picked: PoolEntry[] = [];
  let count = 0;
  for (const entry of order) {
    const size = entry.item.questions.length;
    if (count + size > wanted) continue;
    picked.push(entry);
    count += size;
    if (count === wanted) break;
  }
  return picked;
}

export interface PoolPlan extends LessonTestPlan {
  /** Sections the pool could not fill, with how many questions are missing (shown to authors, never to learners). */
  short: Array<{ section: string; missing: number }>;
}

/**
 * One run of a fixed mock test: the recipe's sections in order, listening before reading, each filled from the
 * pool with the questions this learner has seen least.
 */
export function planPoolTest(
  pool: readonly PoolEntry[],
  recipe: MockRecipe,
  parts: readonly LessonTestPart[],
  seen: Record<string, number>,
  seed: string,
): PoolPlan {
  const rng = createQuizRng(`${recipe.key}:${seed}`);
  const planItem = createItemPlanner(rng);
  const bySection = new Map<string, PoolEntry[]>();
  for (const entry of pool) {
    if (!parts.includes(entry.part)) continue;
    const list = bySection.get(entry.section);
    if (list) list.push(entry);
    else bySection.set(entry.section, [entry]);
  }
  const items: PlannedItem[] = [];
  const short: PoolPlan['short'] = [];
  for (const line of recipe.lines) {
    const entries = bySection.get(line.section) ?? [];
    if (!entries.length && !pool.some((entry) => entry.section === line.section)) {
      short.push({ section: line.section, missing: line.questions });
      continue;
    }
    if (!entries.length) continue; // A section of a skill this run leaves out.
    const drawn = drawSection(entries, line.questions, seen, rng);
    const got = drawn.reduce((sum, entry) => sum + entry.item.questions.length, 0);
    if (got < line.questions) short.push({ section: line.section, missing: line.questions - got });
    for (const entry of drawn) items.push(planItem(line.section, entry.part, entry.item));
  }
  items.sort((a, b) => (a.part === b.part ? 0 : a.part === 'listening' ? -1 : 1));
  return { key: recipe.key, seed, items, short };
}

/** The pool's questions by item id, for the test screen and the scorer. */
export function poolItemIndex(pool: readonly PoolEntry[]): Map<string, LessonTestItem> {
  return new Map(pool.map((entry) => [entry.item.id, entry.item] as const));
}
