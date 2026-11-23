import type { LessonTestItem, LessonTestLesson, LessonTestPart } from '../../types/lessonTest';
import { LESSON_TEST_PARTS, createItemPlanner, type LessonTestPlan, type PlannedItem } from '../lesson/lessonTestPlan';
import { createQuizRng, type QuizRng } from '../vocabulary/quizDirector';

/**
 * The mock test's question pool. Every question the app has (lesson tests and ones written for the mock test)
 * is one entry with its labels: its band, its section of the official paper, its level and its difficulty. A
 * fixed test is a recipe: so many questions from each section. Adding questions to the pool needs no code change.
 */

/** N = Novice (準備級), then the three official bands. */
export type MockBand = 'N' | 'A' | 'B' | 'C';

export interface PoolEntry {
  item: LessonTestItem;
  part: LessonTestPart;
  band: MockBand;
  /** Band, skill and shape, e.g. "A:listening:picture-hear": what a recipe line asks for. */
  section: string;
  /** TOCFL level: 0.5 and 0.9 for Novice 1 and 2, then 1 to 6. */
  level: number;
  /** Where it sits on the ability scale (the adaptive test's, shared by the band scores). */
  difficulty: number;
  /** Questions that stand in for each other (a lesson test slot's versions): one test shows only one of them. */
  family: string;
  /** The lesson (or mock set) it comes from: its book decides the shared sounds and the pause between speakers. */
  origin: Pick<LessonTestLesson, 'key' | 'bookId' | 'lessonId' | 'band' | 'allowWords'>;
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

const questionsOf = (entries: readonly PoolEntry[]) => entries.reduce((sum, entry) => sum + entry.item.questions.length, 0);

/** Whether some of these group sizes add up to exactly `target`. */
function canSum(sizes: readonly number[], target: number): boolean {
  const reach = new Uint8Array(target + 1);
  reach[0] = 1;
  for (const size of sizes) for (let sum = target; sum >= size; sum -= 1) if (reach[sum - size]) reach[sum] = 1;
  return reach[target] === 1;
}

/**
 * Draws up to `wanted` questions: the band's levels take turns so a paper mixes them, least-seen questions first
 * within a level (a random order among equals), never two of one family, never past `wanted`. A recording or text
 * with several questions is taken only if the rest can still add up exactly, so a paper keeps its length.
 */
function draw(entries: readonly PoolEntry[], wanted: number, seen: Record<string, number>, taken: Set<string>, rng: QuizRng): PoolEntry[] {
  const byLevel = new Map<number, PoolEntry[]>();
  for (const entry of shuffled(entries, rng).sort((a, b) => (seen[a.item.id] ?? 0) - (seen[b.item.id] ?? 0))) {
    const list = byLevel.get(entry.level);
    if (list) list.push(entry);
    else byLevel.set(entry.level, [entry]);
  }
  const queues = [...byLevel.entries()].sort(([a], [b]) => a - b).map(([, list]) => list);
  const size = (entry: PoolEntry) => entry.item.questions.length;
  const picked: PoolEntry[] = [];
  let count = 0;
  /** Exact while the remaining questions can still be made up; once they can't, the closest fit will do. */
  let exact = true;
  let misses = 0;
  for (let turn = 0; count < wanted && misses < queues.length; turn += 1) {
    const queue = queues[turn % queues.length];
    const fits = (entry: PoolEntry) => !taken.has(entry.family) && count + size(entry) <= wanted;
    const completes = (entry: PoolEntry) => {
      const rest = wanted - count - size(entry);
      if (rest === 0) return true;
      // One size per family still free: a family's versions cannot both be taken.
      const free = new Map<string, number>();
      for (const other of queues.flat()) if (other.family !== entry.family && !taken.has(other.family)) free.set(other.family, Math.max(free.get(other.family) ?? 0, size(other)));
      return canSum([...free.values()], rest);
    };
    const index = queue.findIndex((entry) => fits(entry) && (!exact || completes(entry)));
    if (index < 0) {
      misses += 1;
      if (misses === queues.length && exact) { exact = false; misses = 0; }
      continue;
    }
    misses = 0;
    const [entry] = queue.splice(index, 1);
    picked.push(entry);
    taken.add(entry.family);
    count += size(entry);
  }
  return picked;
}

export interface PoolPlan extends LessonTestPlan {
  /** Sections the pool could not fill, with how many questions are missing (shown to authors, never to learners). */
  short: Array<{ section: string; missing: number }>;
}

/**
 * One run of a fixed mock test: the recipe's sections in order, listening before reading, each filled from the
 * pool with the questions this learner has seen least. A section the pool cannot fill is reported in `short`, and
 * the test keeps its length with other questions of the same band and skill.
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
  const items: PlannedItem[] = [];
  const short: PoolPlan['short'] = [];
  const taken = new Set<string>();
  for (const part of LESSON_TEST_PARTS.map((entry) => entry.part).filter((entry) => parts.includes(entry))) {
    const prefix = `${recipe.band}:${part}:`;
    const lines = recipe.lines.filter((line) => line.section.startsWith(prefix));
    const drawn: Array<{ slot: string; entry: PoolEntry }> = [];
    let missing = 0;
    for (const line of lines) {
      const picked = draw(pool.filter((entry) => entry.section === line.section), line.questions, seen, taken, rng);
      const got = questionsOf(picked);
      if (got < line.questions) short.push({ section: line.section, missing: line.questions - got });
      missing += line.questions - got;
      drawn.push(...picked.map((entry) => ({ slot: line.section, entry })));
    }
    if (missing > 0) {
      const rest = pool.filter((entry) => entry.band === recipe.band && entry.part === part);
      drawn.push(...draw(rest, missing, seen, taken, rng).map((entry) => ({ slot: `${prefix}any`, entry })));
    }
    for (const { slot, entry } of drawn) items.push(planItem(slot, part, entry.item));
  }
  return { key: recipe.key, seed, items, short };
}

/** The pool's questions by item id, for the test screen and the scorer. */
export function poolItemIndex(pool: readonly PoolEntry[]): Map<string, LessonTestItem> {
  return new Map(pool.map((entry) => [entry.item.id, entry.item] as const));
}
