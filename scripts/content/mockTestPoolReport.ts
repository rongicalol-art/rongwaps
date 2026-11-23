/**
 * The mock test's question pool as one page to read and track: totals, what each band's full paper needs against
 * what the pool has, questions per level, and every question behind filters.
 *
 *   npm run mock-test:pool      # writes output/mock-test-pool/index.html and pool.json (gitignored)
 *
 * Built from the authored lesson tests with the app's own labels, so it always shows what the mock test would
 * draw from. Run it again after adding questions.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { LessonTestItem, LessonTestLesson, TestChoice } from '../../src/types/lessonTest';
import { BAND_LEVELS } from '../../src/utils/mockTest/bandScore';
import { itemShape, lessonPoolEntries } from '../../src/utils/mockTest/poolLabels';
import { RECIPE_BANDS, mockRecipe } from '../../src/utils/mockTest/recipes';

const ROOT = path.resolve(import.meta.dirname, '../..');
const SOURCE = path.join(ROOT, 'content/lesson-tests');
const OUT = path.join(ROOT, 'output/mock-test-pool');
const SPEAKERS = { F: 'Woman', M: 'Man', N: 'Narrator' } as const;

const choiceText = (choice: TestChoice) => choice.traditional ?? `[picture] ${choice.alt ?? choice.picture ?? ''}`.trim();

/** What the learner hears or reads before the questions, and the picture's description if there is one. */
function stimulus(item: LessonTestItem): { lines?: Array<[string, string]>; text?: string; pic?: string; bank?: string[] } {
  switch (item.kind) {
    case 'hear-pick-picture':
      return { lines: item.lines.map((line) => [SPEAKERS[line.speaker], line.traditional]) };
    case 'dialogue':
      return { lines: [...(item.intro ? [item.intro] : []), ...item.lines].map((line) => [SPEAKERS[line.speaker], line.traditional]) };
    case 'picture-hear': return { pic: item.picture.alt };
    case 'realia': return { pic: item.alt, text: item.transcript.traditional };
    case 'scene-gap': return { pic: item.alt };
    case 'paragraph-bank': return { text: item.passage.traditional, bank: item.bank.map((entry) => entry.traditional) };
    case 'cloze': return { text: item.passage.traditional };
    case 'reading': return { text: [item.title?.traditional, item.text.traditional].filter(Boolean).join('\n') };
    case 'read-pick-picture': return {};
  }
}

const lessons = readdirSync(SOURCE)
  .filter((name) => name.startsWith('book-'))
  .flatMap((book) => readdirSync(path.join(SOURCE, book)).filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(readFileSync(path.join(SOURCE, book, file), 'utf8')) as LessonTestLesson));

const records = lessons.flatMap(lessonPoolEntries).map((entry) => ({
  id: entry.item.id,
  band: entry.band,
  part: entry.part,
  level: entry.level,
  shape: itemShape(entry.item),
  book: entry.origin.bookId,
  lesson: entry.origin.lessonId,
  family: entry.family,
  ...stimulus(entry.item),
  q: entry.item.questions.map((question) => ({
    ...(question.prompt ? { p: question.prompt.traditional } : {}),
    ...(question.choices ? { c: question.choices.map(choiceText) } : {}),
    k: question.key,
    why: question.why,
  })),
}));

const meta = {
  built: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  // Each band's full paper: [shape, questions] per skill, in paper order.
  recipes: Object.fromEntries(RECIPE_BANDS.map((band) => [band, Object.fromEntries((['listening', 'reading'] as const).map((part) => [
    part,
    mockRecipe(band, 'full').lines.filter((line) => line.section.startsWith(`${band}:${part}:`)).map((line) => [line.section.split(':')[2], line.questions]),
  ]))])),
  bandLevels: Object.fromEntries(RECIPE_BANDS.map((band) => [band, BAND_LEVELS[band].map((level) => level.level)])),
};

mkdirSync(OUT, { recursive: true });
const page = readFileSync(path.join(import.meta.dirname, 'mockTestPoolPage.html'), 'utf8');
// `<` is escaped so no text in the data can close the script tag.
writeFileSync(path.join(OUT, 'index.html'), page.replace('__META__', () => JSON.stringify(meta).replaceAll('<', '\\u003c')));
// One record per line, so a diff of two builds shows exactly which questions came or went.
writeFileSync(path.join(OUT, 'pool.json'), `[\n${records.map((record) => JSON.stringify(record)).join(',\n')}\n]\n`);

const questions = records.reduce((sum, record) => sum + record.q.length, 0);
console.log(`Mock test pool: ${records.length} recordings and texts, ${questions} questions → ${path.relative(ROOT, OUT)}/index.html`);
