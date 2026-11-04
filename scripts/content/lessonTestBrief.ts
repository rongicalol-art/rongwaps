/**
 * Write the source brief an author needs for one lesson test: the lesson's words, grammar points and dialogues,
 * plus what earlier lessons taught (for review slots), all from the generated packs.
 *
 *   npx tsx scripts/content/lessonTestBrief.ts b1l01 [b1l02 …] [--out output/lesson-test-briefs]
 *
 * Guide: content/lesson-tests/README.md. Check drafts with checkLessonTest.ts.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { getReadingIllustration } from '../../src/data/readingIllustrations';
import { vocabBook, vocabOrder } from '../../src/utils/lesson/lessonScope';
import { isTaughtWord, loadLessonTestContext, picturePath, READING_PICTURE_PREFIX, type VocabEntry } from './lessonTestRules';

interface ReadingLine { speaker?: string; traditional: string; english?: string }
interface Reading { id: string; lessonId: number; dialogueNumber: number; title: string; setting?: string; paragraphs: ReadingLine[] }

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const outDir = resolve(outIndex >= 0 ? args[outIndex + 1] : 'output/lesson-test-briefs');
const keys = args.filter((arg, index) => /^b\d+l\d+$/.test(arg) && args[index - 1] !== '--out');
if (keys.length === 0) {
  console.error('Usage: lessonTestBrief.ts b1l01 [b1l02 …] [--out dir]');
  process.exit(2);
}

const ctx = loadLessonTestContext();
const readingsByBook = new Map<number, Reading[]>();
const readings = (book: number) => {
  if (!readingsByBook.has(book)) {
    readingsByBook.set(book, JSON.parse(readFileSync(resolve(`public/data/readings/book-${book}.json`), 'utf-8')).items as Reading[]);
  }
  return readingsByBook.get(book)!;
};
const lessonOf = (id: string) => Math.floor(vocabOrder(id) / 10);
/** Reading speakers that are not characters (Book 3 essays are read by 旁白). */
const NARRATORS = new Set(['narrator', '旁白']);
const wordRow = (word: VocabEntry) => `| ${word.id} | ${word.traditional} | ${word.simplified ?? ''} | ${word.pinyin ?? ''} | ${word.simple ?? word.meaning ?? ''} | ${word.pos ?? ''} |`;

function brief(key: string): string {
  const [, book, lesson] = /^b(\d+)l(\d+)$/.exec(key)!.map(Number);
  const grammar = ctx.grammarByBook.get(book) ?? [];
  const parts = grammar.filter((part) => part.lessonId === lesson);
  const pages = parts.flatMap((part) => part.grammarPages);
  const title = pages[0] ? `${pages[0].lessonTitle} · ${pages[0].lessonTitleEnglish}` : '';
  const thisWords = ctx.vocab.filter((word) => vocabBook(word.id) === book && lessonOf(word.id) === lesson);
  const out: string[] = [];
  out.push(`# Brief: Book ${book} Lesson ${lesson} — ${title}`);
  out.push('');
  out.push(`- Key: \`${key}\` · band ${book <= 2 ? 'A (3 choices; Book 1 uses pictures)' : 'B (4 choices, text only)'} · file: \`content/lesson-tests/book-${book}/lesson${String(lesson).padStart(2, '0')}.json\``);
  out.push(`- Ids start with \`${key}-\`. Grammar ids every run must test: ${pages.map((page) => `\`${page.id}\``).join(', ') || 'none'}.`);
  out.push('- Taught = the words below for this lesson and every earlier lesson (and earlier books), plus words in this book\'s grammar examples up to this lesson, numerals, and `allowWords`.');
  out.push('');
  out.push(`## This lesson's words (${thisWords.length})`);
  out.push('');
  out.push('| id | traditional | simplified | pinyin | meaning | pos |');
  out.push('| --- | --- | --- | --- | --- | --- |');
  thisWords.forEach((word) => out.push(wordRow(word)));
  out.push('');
  out.push(`## This lesson's grammar (${pages.length} points)`);
  for (const page of pages) {
    out.push('');
    out.push(`### \`${page.id}\` ${page.titleTraditional} — ${page.titleEnglish}`);
    out.push(`Pattern: ${page.pattern}`);
    out.push('');
    out.push(page.explanation);
    for (const example of page.examples.slice(0, 4)) out.push(`- ${example.text.traditional} — ${example.text.english}`);
  }
  out.push('');
  out.push("## This lesson's dialogues (the book's own text: use its situations, not its sentences word for word)");
  for (const reading of readings(book).filter((entry) => entry.lessonId === lesson)) {
    out.push('');
    out.push(`### ${reading.title}${reading.setting ? ` · ${reading.setting}` : ''}`);
    for (const line of reading.paragraphs) out.push(`- ${line.speaker ? `${line.speaker}：` : ''}${line.traditional}${line.english ? ` (${line.english})` : ''}`);
  }
  if (book <= 2) {
    out.push('');
    out.push(`## This lesson's reading pictures (real art: use one for each "look at the picture and listen" slot)`);
    out.push('');
    out.push('Name it `reading:<id>` in the lesson file. Open the file to see exactly what it shows before you write sentences about it.');
    for (const reading of readings(book).filter((entry) => entry.lessonId === lesson)) {
      const picture = getReadingIllustration(reading.id);
      const path = picture ? picturePath(`${READING_PICTURE_PREFIX}${reading.id}`) : null;
      if (picture && path) out.push(`- \`${READING_PICTURE_PREFIX}${reading.id}\` — ${relative(process.cwd(), path)} — ${picture.alt}`);
    }
  }
  const names = new Set<string>();
  for (const reading of readings(book).filter((entry) => entry.lessonId <= lesson)) {
    for (const line of reading.paragraphs) if (line.speaker && !NARRATORS.has(line.speaker)) names.add(line.speaker);
  }
  out.push('');
  out.push(`## Names from the book so far (add the ones you use to \`allowWords\`)`);
  out.push('');
  out.push([...names].join('、') || 'none');
  out.push('');
  out.push('## Earlier lessons (for review slots: name the lesson in each question\'s `lesson`)');
  for (let earlier = lesson - 1; earlier >= 0; earlier -= 1) {
    const words = ctx.vocab.filter((word) => vocabBook(word.id) === book && lessonOf(word.id) === earlier);
    if (words.length === 0) continue;
    const earlierPages = grammar.filter((part) => part.lessonId === earlier).flatMap((part) => part.grammarPages);
    out.push('');
    out.push(`### Lesson ${earlier}${earlierPages[0] ? ` — ${earlierPages[0].lessonTitle} · ${earlierPages[0].lessonTitleEnglish}` : ' (classroom words)'}`);
    if (earlierPages.length) out.push(`Grammar: ${earlierPages.map((page) => `\`${page.id}\` ${page.titleTraditional}`).join('; ')}`);
    out.push(`Words: ${words.map((word) => `${word.traditional} ${word.id} (${word.simple ?? word.meaning ?? ''})`).join('; ')}`);
  }
  // A later book's Lesson 1 reviews the second half of the book before (content/lesson-tests/README.md).
  if (lesson === 1 && book > 1) {
    const before = book - 1;
    const beforeGrammar = ctx.grammarByBook.get(before) ?? [];
    out.push('');
    out.push(`## Review for this Lesson 1: Book ${before} Lessons 9–16 (set \`"book": ${before}\` and \`"lesson"\` on each review question)`);
    for (let earlier = 9; earlier <= 16; earlier += 1) {
      const words = ctx.vocab.filter((word) => vocabBook(word.id) === before && lessonOf(word.id) === earlier);
      const earlierPages = beforeGrammar.filter((part) => part.lessonId === earlier).flatMap((part) => part.grammarPages);
      out.push('');
      out.push(`### Book ${before} Lesson ${earlier}${earlierPages[0] ? ` — ${earlierPages[0].lessonTitle} · ${earlierPages[0].lessonTitleEnglish}` : ''}`);
      for (const page of earlierPages) out.push(`- Grammar \`${page.id}\` ${page.titleTraditional} — ${page.titleEnglish}${page.examples[0] ? `: ${page.examples[0].text.traditional}` : ''}`);
      out.push(`- Words: ${words.map((word) => `${word.traditional} ${word.id} (${word.simple ?? word.meaning ?? ''})`).join('; ')}`);
      for (const reading of readings(before).filter((entry) => entry.lessonId === earlier)) out.push(`- Reading ${reading.id}: ${reading.title}${reading.setting ? ` · ${reading.setting}` : ''}`);
    }
  }
  const earlierBooks = ctx.vocab.filter((word) => vocabBook(word.id) < book);
  if (earlierBooks.length) {
    out.push('');
    out.push(`## Earlier books: ${earlierBooks.length} words, all taught (see public/data/vocabulary/book-1.json … book-${book - 1}.json)`);
  }
  out.push('');
  out.push(`Taught-word count by the end of this lesson: ${ctx.vocab.filter((word) => isTaughtWord(word.id, book, lesson)).length}.`);
  return `${out.join('\n')}\n`;
}

mkdirSync(outDir, { recursive: true });
for (const key of keys) {
  const path = resolve(outDir, `${key}.md`);
  writeFileSync(path, brief(key));
  console.log(`wrote ${path}`);
}
