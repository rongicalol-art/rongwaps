/**
 * Exports the public sample each lesson page shows (src/screens/lesson-page/data/book-N.ts):
 * the lesson's title, a few words with their recording, its grammar point names, and the page's
 * short conversation (content/lesson-pages/book-N.json) with every tappable word resolved to a
 * vocabulary entry. The packs themselves stay login-gated.
 *
 * Fails when a conversation uses a word the learner has not met by that lesson (earlier books
 * count as met).
 * Run: npm run lesson-pages:export
 */
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { LESSON_PAGE_BOOKS, LESSON_PAGE_LESSONS } from '../../src/app/routes';
import { LOCKED_BOOK_LESSON_TITLES, SAMPLE_LESSONS } from '../../src/data/books';

interface VocabItem { id: string; traditional: string; pinyin: string; meaning: string; simple?: string; audio?: string }
interface GrammarPage { grammarNumber: number; titleEnglish: string; titleTraditional: string }
interface GrammarDoc { lessonId: number; grammarPages: GrammarPage[] }
interface Reading { id: string; lessonId: number; title: string }

const WORDS_SHOWN = 7;
const RECORDING = /^vocabulary-trimmed\/v1\/(B\dL\d{2}-\d-\d{2}-[a-f0-9]{12}\.mp3)$/;
const read = <T,>(file: string) => JSON.parse(readFileSync(file, 'utf8')) as T;

/** Book and lesson as one sortable number: Book 2 Lesson 5 is 205. */
const placeOf = (id: string) => Number(id[1]) * 100 + Number(id.slice(3, 5));
/** `想（要）` answers to 想 and 想要; `捷運/地鐵` to either. */
function spellings(traditional: string): string[] {
  return traditional.split('/').flatMap((form) => [form.replace(/（[^）]*）/g, ''), form.replace(/[（）]/g, '')]);
}
const hasRecording = (item: VocabItem) => RECORDING.test(item.audio ?? '');
/** The measure-word note (`(M: 張 zhāng)`) belongs to the full card, not a one-line gloss. */
const gloss = (item: VocabItem) => (item.simple || item.meaning).replace(/\s*\(M: [^)]*\)/, '');
const word = (item: VocabItem, shown = item.traditional) => [shown, item.pinyin, gloss(item), RECORDING.exec(item.audio ?? '')![1]] as const;

/** Every book's words up to the last book with pages: a Book 2 page may use Book 1 words. */
const vocab = Array.from({ length: Math.max(...LESSON_PAGE_BOOKS) }, (_, index) =>
  read<{ items: VocabItem[] }>(`public/data/vocabulary/book-${index + 1}.json`).items).flat();

/** Book 1's titles live in the app; later books take the Chinese title from the lesson's dialogue. */
function titleOf(book: number, lesson: number, readings: Reading[]): [string, string] {
  if (book === 1) {
    const [en, zh] = SAMPLE_LESSONS.find((item) => item.id === lesson)!.title.split(' · ');
    return [en, zh];
  }
  const en = LOCKED_BOOK_LESSON_TITLES[book]?.[lesson - 1];
  const dialogue = readings.find((item) => item.lessonId === lesson && item.id.endsWith('-R01'));
  const zh = dialogue?.title.split(' · ').find((part) => part !== '對話' && /[一-鿿]/.test(part));
  if (!en || !zh) throw new Error(`Book ${book} Lesson ${lesson}: missing title`);
  return [en, zh];
}

function resolve(token: string, place: number): VocabItem {
  const [text, pin] = token.split('@');
  const where = `Book ${Math.floor(place / 100)} Lesson ${place % 100}`;
  if (pin) {
    const pinned = vocab.find((item) => item.id === pin);
    if (!pinned || placeOf(pinned.id) > place || !spellings(pinned.traditional).includes(text) || !hasRecording(pinned)) throw new Error(`${where}: bad pin ${token}`);
    return pinned;
  }
  // The newest entry the learner has met: a word re-taught later carries the later meaning.
  const known = vocab.filter((item) => placeOf(item.id) <= place && spellings(item.traditional).includes(text) && hasRecording(item));
  const match = known.sort((a, b) => placeOf(b.id) - placeOf(a.id))[0];
  if (!match) throw new Error(`${where}: "${text}" is not taught by this lesson or has no recording (mark it =${text} if it should not be tappable)`);
  return match;
}

const PUNCTUATION = /^[，。！？、]+$/;
interface Page { title: [string, string]; wordCount: number; words: (readonly string[])[]; lines: (readonly string[] | string)[][]; grammar: (readonly string[])[] }
const books: Record<number, Record<number, Page>> = {};
/** Every bad word at once, so one run lists all the fixes. */
const problems: string[] = [];
for (const book of LESSON_PAGE_BOOKS) {
  const grammar = read<{ items: GrammarDoc[] }>(`public/data/grammar/book-${book}.json`).items;
  const readings = book === 1 ? [] : read<Reading[]>(`content/readings/book-${book}.json`);
  const conversations = read<Record<string, string[] | string>>(`content/lesson-pages/book-${book}.json`);
  books[book] = {};
  for (let lesson = 1; lesson <= LESSON_PAGE_LESSONS; lesson++) {
    const place = book * 100 + lesson;
    const lines = conversations[String(lesson)];
    if (!Array.isArray(lines) || lines.length !== 4) throw new Error(`Book ${book} Lesson ${lesson}: expected 4 conversation lines`);
    const own = vocab.filter((item) => placeOf(item.id) === place);
    books[book][lesson] = {
      title: titleOf(book, lesson, readings),
      wordCount: own.length,
      words: own.filter((item) => !/[（/]/.test(item.traditional) && hasRecording(item)).slice(0, WORDS_SHOWN).map((item) => word(item)),
      lines: lines.map((line) => line.split(' ').map((token) => {
        if (PUNCTUATION.test(token)) return token;
        if (token.startsWith('=')) return token.slice(1);
        try { return word(resolve(token, place), token.split('@')[0]); } catch (error) { problems.push((error as Error).message); return token; }
      })),
      grammar: grammar.filter((doc) => doc.lessonId === lesson).flatMap((doc) => doc.grammarPages)
        .sort((a, b) => a.grammarNumber - b.grammarNumber).map((page) => [page.titleEnglish, page.titleTraditional] as const),
    };
  }
}

if (problems.length) throw new Error(`${problems.length} problem(s):\n${problems.join('\n')}`);

const row = (value: unknown) => JSON.stringify(value);
mkdirSync('src/screens/lesson-page/data', { recursive: true });
for (const [book, pages] of Object.entries(books)) {
  const body = Object.entries(pages).map(([lesson, page]) => [
    `  ${lesson}: {`,
    `    title: ${row(page.title)},`,
    `    wordCount: ${page.wordCount},`,
    `    words: [\n${page.words.map((w) => `      ${row(w)},`).join('\n')}\n    ],`,
    `    lines: [\n${page.lines.map((line) => `      [${line.map(row).join(', ')}],`).join('\n')}\n    ],`,
    `    grammar: [\n${page.grammar.map((g) => `      ${row(g)},`).join('\n')}\n    ],`,
    '  },',
  ].join('\n')).join('\n');
  writeFileSync(`src/screens/lesson-page/data/book-${book}.ts`, `/**
 * GENERATED by scripts/content/exportLessonPages.ts (npm run lesson-pages:export). Do not edit by hand.
 * The public sample behind /books/${book}/lesson-N: the title, a few words and their recordings, grammar
 * point names, and the short conversation written for the page (content/lesson-pages/book-${book}.json).
 */
import type { LessonPageData } from '../lessonPageTypes';

export const PAGES: Readonly<Record<number, LessonPageData>> = {
${body}
};
`);
}
console.log(`lesson pages: ${Object.values(books).reduce((sum, pages) => sum + Object.keys(pages).length, 0)} lessons exported`);
