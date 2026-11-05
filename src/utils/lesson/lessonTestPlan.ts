import type {
  LessonTestItem,
  LessonTestLesson,
  LessonTestPart,
  LessonTestQuestion,
  LessonTestSlot,
} from '../../types/lessonTest';
import { createQuizRng, type QuizRng } from '../vocabulary/quizDirector';

/**
 * One run of a lesson test: which version of each slot, and the order its choices show in. Pure and
 * seeded, so a resumed or retaken test is reproducible. Rules (content/lesson-tests/README.md):
 * the least-seen version of each slot wins (ties: earlier lessons the learner missed weigh ×3), and the
 * right answer's letter is spread evenly over A/B/C(/D) across the run.
 */
export interface PlannedItem {
  slotId: string;
  part: LessonTestPart;
  itemId: string;
  /** Question id → display order (display position → original choice index). */
  orders: Record<string, number[]>;
  /** A paragraph bank's display order (display position → bank index). */
  bankOrder?: number[];
}

export interface LessonTestPlan {
  key: string;
  seed: string;
  items: PlannedItem[];
}

export interface LessonTestHistory {
  seen?: Record<string, number>;
  missedLessons?: number[];
}

/** One screen of the test: one question, or every blank of a paragraph. */
export interface LessonTestScreen {
  itemId: string;
  questionIds: string[];
  part: LessonTestPart;
}

function shuffled<T>(values: T[], rng: QuizRng): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickVersion(slot: LessonTestSlot, lessonId: number, history: LessonTestHistory, rng: QuizRng): LessonTestItem {
  const seen = (item: LessonTestItem) => history.seen?.[item.id] ?? 0;
  const least = Math.min(...slot.versions.map(seen));
  const pool = slot.versions.filter((item) => seen(item) === least);
  const missed = new Set(history.missedLessons ?? []);
  const weight = (item: LessonTestItem) => (
    item.questions.some((question) => question.lesson !== lessonId && missed.has(question.lesson)) ? 3 : 1
  );
  const total = pool.reduce((sum, item) => sum + weight(item), 0);
  let roll = rng() * total;
  for (const item of pool) {
    roll -= weight(item);
    if (roll < 0) return item;
  }
  return pool[pool.length - 1];
}

/** Hands out answer positions so each letter is used about equally across the run. */
function positionDealer(rng: QuizRng) {
  const decks = new Map<number, number[]>();
  return (count: number) => {
    let deck = decks.get(count);
    if (!deck || deck.length === 0) {
      deck = shuffled(Array.from({ length: count }, (_, index) => index), rng);
      decks.set(count, deck);
    }
    return deck.pop()!;
  };
}

function orderWithKeyAt(count: number, key: number, target: number, rng: QuizRng): number[] {
  const others = shuffled(Array.from({ length: count }, (_, index) => index).filter((index) => index !== key), rng);
  others.splice(target, 0, key);
  return others;
}

/** A bank order where the answers don't simply follow the blanks (that would give them away). */
function bankOrderFor(bankSize: number, keys: number[], rng: QuizRng): number[] {
  let order = shuffled(Array.from({ length: bankSize }, (_, index) => index), rng);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const positions = keys.map((key) => order.indexOf(key));
    if (!positions.every((position, index) => index === 0 || position > positions[index - 1])) break;
    order = shuffled(order, rng);
  }
  return order;
}

export function planLessonTest(lesson: LessonTestLesson, history: LessonTestHistory, seed: string): LessonTestPlan {
  const rng = createQuizRng(`${lesson.key}:${seed}`);
  const deal = positionDealer(rng);
  const items = lesson.slots.map((slot): PlannedItem => {
    const item = pickVersion(slot, lesson.lessonId, history, rng);
    const orders: Record<string, number[]> = {};
    for (const question of item.questions) {
      if (!question.choices) continue;
      orders[question.id] = orderWithKeyAt(question.choices.length, question.key, deal(question.choices.length), rng);
    }
    const planned: PlannedItem = { slotId: slot.id, part: slot.part, itemId: item.id, orders };
    if (item.kind === 'paragraph-bank') planned.bankOrder = bankOrderFor(item.bank.length, item.questions.map((q) => q.key), rng);
    return planned;
  });
  // TOCFL order: every listening question before reading.
  items.sort((a, b) => (a.part === b.part ? 0 : a.part === 'listening' ? -1 : 1));
  return { key: lesson.key, seed, items };
}

/** Questions in one run: one version of every slot (a slot's versions ask the same number). */
export function lessonTestQuestionCount(lesson: LessonTestLesson): number {
  return lesson.slots.reduce((sum, slot) => sum + (slot.versions[0]?.questions.length ?? 0), 0);
}

export function lessonItemIndex(lesson: LessonTestLesson): Map<string, LessonTestItem> {
  return new Map(lesson.slots.flatMap((slot) => slot.versions.map((item) => [item.id, item] as const)));
}

/**
 * Screens in order: paragraphs, cloze passages and a recording's questions (it plays once, so all of them are on
 * screen while it plays, as in the TOCFL booklet) are one screen; other items show one question each.
 */
export function lessonTestScreens(lesson: LessonTestLesson, plan: LessonTestPlan): LessonTestScreen[] {
  const byId = lessonItemIndex(lesson);
  return plan.items.flatMap((planned) => {
    const item = byId.get(planned.itemId);
    if (!item) return [];
    if (item.kind === 'paragraph-bank' || item.kind === 'cloze' || item.kind === 'dialogue') {
      return [{ itemId: item.id, questionIds: item.questions.map((q) => q.id), part: planned.part }];
    }
    return item.questions.map((question) => ({ itemId: item.id, questionIds: [question.id], part: planned.part }));
  });
}

export interface LessonTestScore {
  correct: number;
  total: number;
  listening: [number, number];
  reading: [number, number];
  missed: Array<{ question: LessonTestQuestion; item: LessonTestItem; part: LessonTestPart }>;
}

/** Score answers (question id → original choice index); unanswered questions count as missed. */
export function scoreLessonTest(lesson: LessonTestLesson, plan: LessonTestPlan, answers: Record<string, number>): LessonTestScore {
  const byId = lessonItemIndex(lesson);
  const score: LessonTestScore = { correct: 0, total: 0, listening: [0, 0], reading: [0, 0], missed: [] };
  for (const planned of plan.items) {
    const item = byId.get(planned.itemId);
    if (!item) continue;
    for (const question of item.questions) {
      const part = score[planned.part];
      const right = answers[question.id] === question.key;
      score.total += 1;
      part[1] += 1;
      if (right) {
        score.correct += 1;
        part[0] += 1;
      } else score.missed.push({ question, item, part: planned.part });
    }
  }
  return score;
}

/** TOCFL lesson tests pass at 80%. */
export const LESSON_TEST_PASS = 0.8;

/** The test's two parts in order. */
export const LESSON_TEST_PARTS: ReadonlyArray<{ part: LessonTestPart; label: string }> = [
  { part: 'listening', label: 'Listening' },
  { part: 'reading', label: 'Reading' },
];
