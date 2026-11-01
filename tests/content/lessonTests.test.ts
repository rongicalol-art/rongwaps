import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readdirSync } from 'node:fs';
import { readJson } from '../acceptance_helpers';
import type { InteractiveGrammarPart } from '../../src/types/models';
import type { LessonTestItem, LessonTestLesson, LessonTestPack, LessonTestQuestion } from '../../src/types/lessonTest';
import { NUMERAL_CHARACTERS, traditionalStrings, untaughtCharacters, vocabBook, vocabForms, vocabOrder } from '../../src/utils/lesson/lessonScope';

/**
 * Authored lesson tests (content/lesson-tests): only taught words, TOCFL-shaped questions with one key each,
 * every grammar point of the lesson in every possible run, and a review share from earlier lessons.
 * Rules: content/lesson-tests/README.md.
 */

interface VocabItem { id: string; traditional: string }
const lessons: LessonTestLesson[] = readdirSync('content/lesson-tests').filter((folder) => /^book-\d+$/.test(folder))
  .flatMap((folder) => readdirSync(`content/lesson-tests/${folder}`).filter((file) => /^lesson\d+\.json$/.test(file))
    .map((file) => readJson<LessonTestLesson>(`content/lesson-tests/${folder}/${file}`)));
const vocabByBook = new Map([1, 2, 3, 4].map((book) => [book, readJson<{ items: VocabItem[] }>(`public/data/vocabulary/book-${book}.json`).items]));
const allVocab = [...vocabByBook.values()].flat();
const vocabIds = new Set(allVocab.map((item) => item.id));
const grammarByBook = new Map([1, 2, 3].map((book) => [book, readJson<{ items: InteractiveGrammarPart[] }>(`public/data/grammar/book-${book}.json`).items]));
const PICTURES = 'src/assets/images/lesson-tests';
const LISTENING_KINDS = new Set(['hear-pick-picture', 'picture-hear', 'dialogue']);
const PICTURE_CHOICE_KINDS = new Set(['hear-pick-picture', 'read-pick-picture']);

/** Words a learner has met by the end of a lesson: earlier books, this book's lessons so far, their grammar examples. */
function taughtThrough(bookId: number, lessonId: number, allow: string[] = []): Set<string> {
  const through = lessonId * 10 + 9;
  const grammar = grammarByBook.get(bookId) ?? [];
  return new Set([
    ...allVocab.filter((item) => vocabBook(item.id) < bookId || (vocabBook(item.id) === bookId && vocabOrder(item.id) <= through))
      .flatMap((item) => vocabForms(item.traditional)),
    ...grammar.filter((part) => part.lessonId <= lessonId).flatMap((part) => part.grammarPages)
      .flatMap((page) => page.examples).flatMap((example) => example.text.words ?? []).map((word) => word.traditional),
    ...allow,
    ...NUMERAL_CHARACTERS,
  ]);
}

const questionsOf = (item: LessonTestItem): LessonTestQuestion[] => item.questions;
const allItems = (lesson: LessonTestLesson) => lesson.slots.flatMap((slot) => slot.versions);

test('lesson tests use only words taught by their lesson', () => {
  const problems: string[] = [];
  for (const lesson of lessons) {
    const taught = taughtThrough(lesson.bookId, lesson.lessonId, lesson.allowWords);
    for (const item of allItems(lesson)) {
      for (const text of traditionalStrings(item)) {
        for (const char of untaughtCharacters(text.replace(/[{}0-9]/g, ''), taught)) {
          problems.push(`${item.id}: "${char}" in "${text}" is not taught by Book ${lesson.bookId} Lesson ${lesson.lessonId}`);
        }
      }
    }
  }
  assert.deepEqual(problems, []);
});

test('lesson test questions are well formed', () => {
  const problems: string[] = [];
  for (const lesson of lessons) {
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
        if (item.kind === 'dialogue' && (item.answerLine < 0 || item.answerLine >= item.lines.length)) problems.push(`${item.id}: answerLine out of range`);
        if (item.kind === 'paragraph-bank') {
          if (item.bank.length !== item.questions.length + 1) problems.push(`${item.id}: the bank needs one extra word`);
          const markers = [...item.passage.traditional.matchAll(/\{(\d+)\}/g)].map((match) => Number(match[1]));
          if (markers.join() !== item.questions.map((_, index) => index + 1).join()) problems.push(`${item.id}: blanks {1}…{n} must match the questions`);
          if (new Set(item.questions.map((q) => q.key)).size !== item.questions.length) problems.push(`${item.id}: each bank word answers one blank`);
        }
        for (const question of questionsOf(item)) {
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
          if (question.lesson > lesson.lessonId) problems.push(`${question.id}: tests lesson ${question.lesson}, after this one`);
          for (const id of question.wordIds) {
            if (!vocabIds.has(id)) problems.push(`${question.id}: unknown word id ${id}`);
            else if (vocabBook(id) > lesson.bookId || (vocabBook(id) === lesson.bookId && vocabOrder(id) > lesson.lessonId * 10 + 9)) problems.push(`${question.id}: ${id} is not taught yet`);
          }
          if (!question.why.trim() || !question.focus.zh || !question.focus.en) problems.push(`${question.id}: needs a reason and a focus`);
        }
      }
    }
  }
  assert.deepEqual(problems, []);
});

test('every picture a lesson test names exists', () => {
  const missing: string[] = [];
  for (const lesson of lessons) {
    const names = new Set<string>();
    for (const item of allItems(lesson)) {
      if ('picture' in item) names.add(typeof item.picture === 'string' ? item.picture : item.picture.picture);
      for (const question of item.questions) for (const choice of question.choices ?? []) if (choice.picture) names.add(choice.picture);
    }
    for (const name of names) if (!existsSync(`${PICTURES}/${name}.webp`)) missing.push(`${lesson.key}: ${name}.webp`);
  }
  assert.deepEqual(missing, []);
});

test('every possible run tests every grammar point of the lesson and reviews earlier lessons', () => {
  const problems: string[] = [];
  for (const lesson of lessons) {
    const points = (grammarByBook.get(lesson.bookId) ?? []).filter((part) => part.lessonId === lesson.lessonId)
      .flatMap((part) => part.grammarPages.map((page) => page.id));
    // Walk every combination of versions (one per slot) and check each run.
    const runs = lesson.slots.reduce<LessonTestItem[][]>((acc, slot) => acc.flatMap((run) => slot.versions.map((item) => [...run, item])), [[]]);
    for (const run of runs) {
      const questions = run.flatMap(questionsOf);
      const tested = new Set(questions.flatMap((question) => question.grammarIds ?? []));
      const missingPoints = points.filter((id) => !tested.has(id));
      if (missingPoints.length) {
        problems.push(`${lesson.key}: a run (${run.map((item) => item.id.split('-').pop()).join('')}) misses ${missingPoints.join(', ')}`);
        break;
      }
      const review = questions.filter((question) => question.lesson < lesson.lessonId).length / questions.length;
      if (lesson.lessonId > 1 && (review < 0.15 || review > 0.45)) {
        problems.push(`${lesson.key}: a run reviews ${Math.round(review * 100)}% earlier lessons (want 15–45%)`);
        break;
      }
      if (questions.length < 16 || questions.length > 28) {
        problems.push(`${lesson.key}: a run has ${questions.length} questions (want 16–28)`);
        break;
      }
    }
  }
  assert.deepEqual(problems, []);
});

test('the exported pack matches the authored tests, and every spoken line has a recording', () => {
  const problems: string[] = [];
  for (const lesson of lessons) {
    const pack = readJson<LessonTestPack>(`public/data/lesson-tests/book-${lesson.bookId}.json`);
    const exported = pack.items.find((item) => item.key === lesson.key);
    if (!exported) { problems.push(`${lesson.key}: not exported (npm run lesson-tests:export)`); continue; }
    // The pack is the authored lesson plus recordings: without its `audio` fields it must be identical.
    const withoutAudio = JSON.parse(JSON.stringify(exported, (field, value) => (field === 'audio' ? undefined : value)));
    if (JSON.stringify(withoutAudio) !== JSON.stringify(lesson)) problems.push(`${lesson.key}: pack is out of date (npm run lesson-tests:export)`);
    const visit = (node: unknown, path: string): void => {
      if (!node || typeof node !== 'object') return;
      const record = node as Record<string, unknown>;
      if ('speaker' in record && !record.audio) problems.push(`${lesson.key}: no recording at ${path}`);
      for (const [field, value] of Object.entries(record)) if (field !== 'audio') visit(value, `${path}.${field}`);
    };
    visit(exported, lesson.key);
    if (!pack.sounds.ding || (['A', 'B', 'C'] as const).some((letter) => !pack.sounds.letters?.[letter])) {
      problems.push(`book ${lesson.bookId}: the ding or a letter has no recording`);
    }
  }
  assert.deepEqual(problems, []);
});
