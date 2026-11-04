/**
 * The lesson-test content rules (content/lesson-tests/README.md), in one place: the content tests
 * (tests/content/lessonTests.test.ts) and the draft checker (checkLessonTest.ts) both call these.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getReadingIllustration } from '../../src/data/readingIllustrations';
import type { InteractiveGrammarPart } from '../../src/types/models';
import type { LessonTestItem, LessonTestLesson, LessonTestQuestion } from '../../src/types/lessonTest';
import { NUMERAL_CHARACTERS, traditionalStrings, untaughtCharacters, vocabBook, vocabForms, vocabOrder } from '../../src/utils/lesson/lessonScope';

export interface VocabEntry { id: string; traditional: string; simplified?: string; pinyin?: string; meaning?: string; simple?: string; pos?: string }

export interface LessonTestContext {
  root: string;
  vocab: VocabEntry[];
  vocabIds: Set<string>;
  grammarByBook: Map<number, InteractiveGrammarPart[]>;
}

const readJson = <T>(root: string, path: string): T => JSON.parse(readFileSync(resolve(root, path), 'utf-8')) as T;

/** Vocabulary of Books 1–4 and grammar of Books 1–3, from the generated packs. */
export function loadLessonTestContext(root = process.cwd()): LessonTestContext {
  const vocab = [1, 2, 3, 4].flatMap((book) => readJson<{ items: VocabEntry[] }>(root, `public/data/vocabulary/book-${book}.json`).items);
  const grammarByBook = new Map([1, 2, 3].map((book) => [book, readJson<{ items: InteractiveGrammarPart[] }>(root, `public/data/grammar/book-${book}.json`).items]));
  return { root, vocab, vocabIds: new Set(vocab.map((item) => item.id)), grammarByBook };
}

/** The last vocabulary order a lesson has taught (B1L04-2-xx is order 42; every part of lesson 4 is ≤ 49). */
const lastOrder = (lessonId: number) => lessonId * 10 + 9;

/** Whether a vocabulary id is taught by the end of this book and lesson. */
export function isTaughtWord(id: string, bookId: number, lessonId: number): boolean {
  return vocabBook(id) < bookId || (vocabBook(id) === bookId && vocabOrder(id) <= lastOrder(lessonId));
}

/** Words a learner has met by the end of a lesson: earlier books, this book's lessons so far, their grammar examples. */
export function taughtThrough(ctx: LessonTestContext, bookId: number, lessonId: number, allow: string[] = []): Set<string> {
  const grammar = ctx.grammarByBook.get(bookId) ?? [];
  return new Set([
    ...ctx.vocab.filter((item) => isTaughtWord(item.id, bookId, lessonId)).flatMap((item) => vocabForms(item.traditional)),
    ...grammar.filter((part) => part.lessonId <= lessonId).flatMap((part) => part.grammarPages)
      .flatMap((page) => page.examples).flatMap((example) => example.text.words ?? []).map((word) => word.traditional),
    ...allow,
    ...NUMERAL_CHARACTERS,
  ]);
}

/** The grammar point ids a lesson teaches. */
export function lessonGrammarIds(ctx: LessonTestContext, bookId: number, lessonId: number): string[] {
  return (ctx.grammarByBook.get(bookId) ?? []).filter((part) => part.lessonId === lessonId)
    .flatMap((part) => part.grammarPages.map((page) => page.id));
}

const LISTENING_KINDS = new Set(['hear-pick-picture', 'picture-hear', 'dialogue']);
const PICTURE_CHOICE_KINDS = new Set(['hear-pick-picture', 'read-pick-picture']);
export const LESSON_TEST_PICTURES = 'src/assets/images/lesson-tests';

const allItems = (lesson: LessonTestLesson) => lesson.slots.flatMap((slot) => slot.versions);

/** Every character a learner reads or hears must belong to a taught word. */
export function scopeProblems(lesson: LessonTestLesson, ctx: LessonTestContext): string[] {
  const problems: string[] = [];
  const taught = taughtThrough(ctx, lesson.bookId, lesson.lessonId, lesson.allowWords);
  for (const item of allItems(lesson)) {
    for (const text of traditionalStrings(item)) {
      for (const char of untaughtCharacters(text.replace(/[{}0-9]/g, ''), taught)) {
        problems.push(`${item.id}: "${char}" in "${text}" is not taught by Book ${lesson.bookId} Lesson ${lesson.lessonId}`);
      }
    }
  }
  return problems;
}

/** TOCFL shape: versions, ids, parts, choices, keys, blanks, word ids, reasons. */
export function structureProblems(lesson: LessonTestLesson, ctx: LessonTestContext): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const choiceCount = lesson.band === 'A' ? 3 : 4;
  for (const slot of lesson.slots) {
    if (slot.versions.length < 2) problems.push(`${slot.id}: needs at least two versions for retakes`);
    const counts = new Set(slot.versions.map((item) => item.questions.length));
    if (counts.size > 1) problems.push(`${slot.id}: every version must ask the same number of questions`);
    for (const item of slot.versions) {
      if (ids.has(item.id)) problems.push(`${item.id}: duplicate id`);
      ids.add(item.id);
      if (LISTENING_KINDS.has(item.kind) !== (slot.part === 'listening')) problems.push(`${item.id}: ${item.kind} does not belong in ${slot.part}`);
      for (const text of [item, ...item.questions]) {
        for (const node of JSON.stringify(text).matchAll(/"traditional":"([^"]*)"(?:,"simplified":"([^"]*)")?/g)) {
          if (!node[2]) problems.push(`${item.id}: "${node[1]}" has no simplified text`);
        }
      }
      if (item.kind === 'dialogue') {
        const inRange = (line: number) => line >= 0 && line < item.lines.length;
        if (!inRange(item.answerLine)) problems.push(`${item.id}: answerLine out of range`);
        if (lesson.band === 'B' && !item.printed) problems.push(`${item.id}: Band B prints its choices (printed: true)`);
        if (lesson.band === 'B' && item.plays !== 1) problems.push(`${item.id}: Band B plays each recording once (plays: 1)`);
        if (item.questions.length > 1 && !item.intro) problems.push(`${item.id}: a recording with several questions opens with the narrator's intro`);
        if (item.intro && item.intro.speaker !== 'N') problems.push(`${item.id}: the intro is the narrator's (speaker N)`);
        for (const question of item.questions) {
          if (item.questions.length > 1 && (question.answerLine === undefined || !inRange(question.answerLine))) problems.push(`${question.id}: each question of a group names its answerLine`);
          if (question.choices?.some((choice) => choice.speaker !== 'N')) problems.push(`${question.id}: the narrator reads every choice (speaker N)`);
          if (!question.prompt || question.prompt.speaker !== 'N') problems.push(`${question.id}: the narrator asks the question (prompt with speaker N)`);
        }
      }
      if (item.kind === 'reading' && item.format === 'table') {
        const widths = new Set(item.text.traditional.split('\n').map((row) => row.split('｜').length));
        if (widths.size !== 1) problems.push(`${item.id}: every table row has the same number of ｜ cells`);
      }
      if (item.kind === 'paragraph-bank') {
        if (item.bank.length !== item.questions.length + 1) problems.push(`${item.id}: the bank needs one extra word`);
        const markers = [...item.passage.traditional.matchAll(/\{(\d+)\}/g)].map((match) => Number(match[1]));
        if (markers.join() !== item.questions.map((_, index) => index + 1).join()) problems.push(`${item.id}: blanks {1}…{n} must match the questions`);
        if (new Set(item.questions.map((q) => q.key)).size !== item.questions.length) problems.push(`${item.id}: each bank word answers one blank`);
      }
      for (const question of item.questions) {
        if (ids.has(question.id)) problems.push(`${question.id}: duplicate id`);
        ids.add(question.id);
        const size = question.choices?.length ?? (item.kind === 'paragraph-bank' ? item.bank.length : 0);
        if (question.key < 0 || question.key >= size) problems.push(`${question.id}: key out of range`);
        if (question.choices && question.choices.length !== choiceCount) problems.push(`${question.id}: Band ${lesson.band} questions have ${choiceCount} choices`);
        const labels = question.choices?.map((choice) => choice.picture ?? choice.traditional) ?? [];
        if (new Set(labels).size !== labels.length) problems.push(`${question.id}: duplicate choices`);
        if (PICTURE_CHOICE_KINDS.has(item.kind) && question.choices?.some((choice) => !choice.picture)) problems.push(`${question.id}: picture questions choose between pictures`);
        if (item.kind === 'scene-gap' && question.prompt?.traditional.split('＿＿').length !== 2) problems.push(`${question.id}: a gap sentence has exactly one ＿＿`);
        if (item.kind === 'scene-gap' && !question.answer) problems.push(`${question.id}: a gap question shows its full answer sentence`);
        if (question.book !== undefined && question.book >= lesson.bookId) problems.push(`${question.id}: book is only for an earlier book's lesson`);
        if (question.book === undefined && question.lesson > lesson.lessonId) problems.push(`${question.id}: tests lesson ${question.lesson}, after this one`);
        // SC-TOP's item-writing rule: Band B choices stay short (about 15 characters at most).
        for (const choice of question.choices ?? []) {
          if (lesson.band === 'B' && [...(choice.traditional ?? '').replace(/[，。、？！：；「」\s]/g, '')].length > 15) problems.push(`${question.id}: choice "${choice.traditional}" is longer than 15 characters`);
        }
        for (const id of question.wordIds) {
          if (!ctx.vocabIds.has(id)) problems.push(`${question.id}: unknown word id ${id}`);
          else if (!isTaughtWord(id, lesson.bookId, lesson.lessonId)) problems.push(`${question.id}: ${id} is not taught yet`);
        }
        if (!question.why.trim() || !question.focus.zh || !question.focus.en) problems.push(`${question.id}: needs a reason and a focus`);
      }
    }
  }
  return problems;
}

/** The picture names a lesson uses. */
export function lessonPictureNames(lesson: LessonTestLesson): string[] {
  const names = new Set<string>();
  for (const item of allItems(lesson)) {
    if ('picture' in item) names.add(typeof item.picture === 'string' ? item.picture : item.picture.picture);
    for (const question of item.questions) for (const choice of question.choices ?? []) if (choice.picture) names.add(choice.picture);
  }
  return [...names];
}

/** A lesson's own reading picture, named `reading:<reading id>` (see src/screens/lesson-test/testPictures.ts). */
export const READING_PICTURE_PREFIX = 'reading:';

/** The file a picture name points at: a lesson-test picture, or a reading picture by its reading id. */
export function picturePath(name: string, root = process.cwd()): string | null {
  if (!name.startsWith(READING_PICTURE_PREFIX)) return resolve(root, `${LESSON_TEST_PICTURES}/${name}.webp`);
  const url = getReadingIllustration(name.slice(READING_PICTURE_PREFIX.length))?.url;
  return url?.startsWith('file:') ? fileURLToPath(url) : null;
}

export function pictureProblems(lesson: LessonTestLesson, ctx: LessonTestContext): string[] {
  return lessonPictureNames(lesson)
    .filter((name) => { const path = picturePath(name, ctx.root); return !path || !existsSync(path); })
    .map((name) => `${lesson.key}: picture ${name} is missing`);
}

/** Every possible run (one version per slot) tests every grammar point, reviews 15–45% earlier lessons, has 16–28 questions. */
export function runProblems(lesson: LessonTestLesson, ctx: LessonTestContext): string[] {
  const problems: string[] = [];
  const points = lessonGrammarIds(ctx, lesson.bookId, lesson.lessonId);
  const runs = lesson.slots.reduce<LessonTestItem[][]>((acc, slot) => acc.flatMap((run) => slot.versions.map((item) => [...run, item])), [[]]);
  for (const run of runs) {
    const questions: LessonTestQuestion[] = run.flatMap((item) => item.questions);
    const tested = new Set(questions.flatMap((question) => question.grammarIds ?? []));
    const missingPoints = points.filter((id) => !tested.has(id));
    if (missingPoints.length) {
      problems.push(`${lesson.key}: a run (${run.map((item) => item.id).join(', ')}) misses ${missingPoints.join(', ')}`);
      break;
    }
    const review = questions.filter((question) => question.book !== undefined || question.lesson < lesson.lessonId).length / questions.length;
    // Only Book 1 Lesson 1 has nothing earlier to review (a later book's Lesson 1 reviews the book before).
    if (!(lesson.bookId === 1 && lesson.lessonId === 1) && (review < 0.15 || review > 0.45)) {
      problems.push(`${lesson.key}: a run reviews ${Math.round(review * 100)}% earlier lessons (want 15–45%)`);
      break;
    }
    if (questions.length < 16 || questions.length > 28) {
      problems.push(`${lesson.key}: a run has ${questions.length} questions (want 16–28)`);
      break;
    }
  }
  return problems;
}

/** All rules for one lesson; `pictures: false` skips the picture files (drafts whose pictures are not drawn yet). */
export function checkLessonTest(lesson: LessonTestLesson, ctx: LessonTestContext, { pictures = true } = {}): string[] {
  return [
    ...scopeProblems(lesson, ctx),
    ...structureProblems(lesson, ctx),
    ...(pictures ? pictureProblems(lesson, ctx) : []),
    ...runProblems(lesson, ctx),
  ];
}
