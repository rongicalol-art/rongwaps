/**
 * Exports the public grammar pages (src/screens/grammar-page/data/book-N.ts and index.ts): each
 * grammar point's title, pattern and rule from the grammar pack, with the sentences written for
 * its page (content/grammar-pages/book-N.json, rules in the README there).
 *
 * Fails when a sentence uses a word the learner has not met by that lesson, when two pages share
 * an address, or when the exercise repeats an example.
 * Run: npm run grammar-pages:export
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

interface VocabItem { id: string; traditional: string; pinyin: string; meaning: string; simple?: string }
interface GrammarPoint { id: string; bookId: number; lessonId: number; grammarNumber: number; titleEnglish: string; titleTraditional: string; pattern: string; explanation: string }
interface AuthoredSentence { zh: string; en: string }
interface AuthoredPage { slug: string; examples: AuthoredSentence[]; exercise: AuthoredSentence }
type Word = readonly [string, string, string] | readonly [string, string, string, 1];
interface Sentence { tokens: (Word | string)[]; pinyin: string; english: string }

const BOOKS = [1, 2, 3];
const read = <T,>(file: string) => JSON.parse(readFileSync(file, 'utf8')) as T;
const HAN = /\p{Script=Han}/u;
const PUNCTUATION: Record<string, string> = { '，': ',', '。': '.', '？': '?', '！': '!', '、': ',' };

/** Book and lesson as one sortable number: Book 2 Lesson 5 is 205. */
const placeOf = (id: string) => Number(id[1]) * 100 + Number(id.slice(3, 5));
/** `想（要）` answers to 想 and 想要; `捷運/地鐵` to either. */
const spellings = (traditional: string) =>
  traditional.split('/').flatMap((form) => [form.replace(/（[^）]*）/g, ''), form.replace(/[（）]/g, '')]);
const gloss = (item: VocabItem) => (item.simple || item.meaning).replace(/\s*\(M: [^)]*\)/, '');

const vocab = BOOKS.flatMap((book) => read<{ items: VocabItem[] }>(`public/data/vocabulary/book-${book}.json`).items);
const problems: string[] = [];

function sentence(authored: AuthoredSentence, point: GrammarPoint, where: string): Sentence {
  const place = point.bookId * 100 + point.lessonId;
  // The pattern's own words (呢, 很／不) are marked wherever a sentence uses them.
  const keys = new Set(point.pattern.split(/[^\p{Script=Han}]+/u).filter(Boolean));
  const tokens = authored.zh.trim().split(/\s+/).map((token): Word | string => {
    if (token in PUNCTUATION) return token;
    // `_` stands for a space inside a word's own pinyin or meaning (王小美|Wáng_Xiǎoměi|Wang_Xiaomei).
    const [hanzi, pinyin, meaning] = token.split('|').map((part) => part.replace(/_/g, ' '));
    const mark = <T extends readonly [string, string, string]>(word: T) => (keys.has(hanzi) ? [...word, 1] as const : word);
    if (pinyin && meaning) return mark([hanzi, pinyin, meaning] as const);
    // The newest card the learner has met: a word re-taught later carries the later meaning.
    const card = vocab.filter((item) => placeOf(item.id) <= place && spellings(item.traditional).includes(hanzi))
      .sort((a, b) => placeOf(b.id) - placeOf(a.id))[0];
    if (!card) { problems.push(`${where}: "${hanzi}" is not taught by this lesson (write it as ${hanzi}|pinyin|meaning if it belongs)`); return token; }
    // A card for two spellings (你好/妳好) lists both readings; take the one for this spelling.
    const forms = card.traditional.split('/');
    const reading = card.pinyin.split('/')[forms.length === card.pinyin.split('/').length ? Math.max(forms.indexOf(hanzi), 0) : 0];
    return mark([hanzi, reading, gloss(card)] as const);
  });
  let pinyin = '';
  for (const token of tokens) {
    if (typeof token === 'string') pinyin += PUNCTUATION[token] ?? token;
    else pinyin += `${pinyin && !pinyin.endsWith(' ') ? ' ' : ''}${token[1]}`;
  }
  return { tokens, pinyin: pinyin.charAt(0).toUpperCase() + pinyin.slice(1), english: authored.en };
}

const row = (value: unknown) => JSON.stringify(value);
const sentenceCode = (value: Sentence, indent: string) =>
  `{ tokens: [${value.tokens.map(row).join(', ')}],\n${indent}  pinyin: ${row(value.pinyin)}, english: ${row(value.english)} }`;

mkdirSync('src/screens/grammar-page/data', { recursive: true });
const links: (readonly [string, number, number, string] | readonly [string, number, number, string, string])[] = [];
const slugs = new Map<string, string>();

for (const book of BOOKS) {
  const file = `content/grammar-pages/book-${book}.json`;
  if (!existsSync(file)) continue;
  const authored = read<Record<string, AuthoredPage>>(file);
  const points = read<{ items: { grammarPages: GrammarPoint[] }[] }>(`public/data/grammar/book-${book}.json`).items.flatMap((doc) => doc.grammarPages);
  const pages = Object.entries(authored).map(([id, page]) => {
    const point = points.find((item) => item.id === id);
    if (!point) throw new Error(`${file}: no grammar point ${id}`);
    const where = `Book ${point.bookId} Lesson ${point.lessonId} "${point.titleTraditional}"`;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(page.slug)) problems.push(`${where}: bad address "${page.slug}"`);
    if (slugs.has(page.slug)) problems.push(`${where}: address "${page.slug}" is already used by ${slugs.get(page.slug)}`);
    slugs.set(page.slug, where);
    if (page.examples.length !== 2) problems.push(`${where}: expected 2 examples`);
    if (page.examples.some((example) => example.zh === page.exercise.zh)) problems.push(`${where}: the exercise repeats an example`);
    const exercise = sentence(page.exercise, point, where);
    const tiles = exercise.tokens.filter((token) => typeof token !== 'string').length;
    if (tiles < 3 || tiles > 6) problems.push(`${where}: the exercise has ${tiles} words (3 to 6)`);
    return {
      point,
      slug: page.slug,
      // `Statement, + new topic + 呢` → Statement · new topic · 呢
      // The book's shorthand for "not" is spelled out for a reader who has not opened the book.
      pattern: point.pattern.split('+').map((part) => part.trim().replace(/,$/, '').replace(/Neg/g, 'not')).filter(Boolean),
      examples: page.examples.map((example) => sentence(example, point, where)),
      exercise,
    };
  }).sort((a, b) => a.point.lessonId - b.point.lessonId || a.point.grammarNumber - b.point.grammarNumber);

  const body = pages.map(({ point, slug, pattern, examples, exercise }) => [
    `  ${row(slug)}: {`,
    `    slug: ${row(slug)}, bookId: ${point.bookId}, lessonId: ${point.lessonId},`,
    `    title: ${row(point.titleEnglish)},`,
    `    focus: ${row(HAN.test(point.pattern) ? point.titleTraditional : '')},`,
    `    pattern: ${row(pattern)},`,
    `    rule: ${row(point.explanation)},`,
    `    examples: [\n${examples.map((example) => `      ${sentenceCode(example, '      ')},`).join('\n')}\n    ],`,
    `    exercise: ${sentenceCode(exercise, '    ')},`,
    '  },',
  ].join('\n')).join('\n');
  writeFileSync(`src/screens/grammar-page/data/book-${book}.ts`, `/**
 * GENERATED by scripts/content/exportGrammarPages.ts (npm run grammar-pages:export). Do not edit by hand.
 * The public pages behind /grammar/<slug> for Book ${book}: title, pattern and rule from the grammar pack,
 * with the sentences written for each page (content/grammar-pages/book-${book}.json).
 */
import type { GrammarPageData } from '../grammarPageTypes';

export const PAGES: Readonly<Record<string, GrammarPageData>> = {
${body}
};
`);
  // A title with no Chinese in it ("Check a Guess") carries its key word for search titles, when it is a word and not a formula.
  const keyWord = (point: GrammarPoint) => (!HAN.test(point.titleEnglish) && HAN.test(point.pattern) && !point.titleTraditional.includes('+') && point.titleTraditional.length <= 12 ? point.titleTraditional : '');
  links.push(...pages.map(({ point, slug }) => (keyWord(point)
    ? [slug, point.bookId, point.lessonId, point.titleEnglish, keyWord(point)] as const
    : [slug, point.bookId, point.lessonId, point.titleEnglish] as const)));
}

if (problems.length) throw new Error(`${problems.length} problem(s):\n${problems.join('\n')}`);

writeFileSync('src/screens/grammar-page/data/index.ts', `/**
 * GENERATED by scripts/content/exportGrammarPages.ts (npm run grammar-pages:export). Do not edit by hand.
 * Every public grammar page in lesson order: address, book, lesson, title, and the pattern's
 * own Chinese word where the title does not show it.
 */
import type { GrammarPageLink } from '../grammarPageTypes';

export const GRAMMAR_PAGES: readonly GrammarPageLink[] = [
${links.map((link) => `  ${row(link)},`).join('\n')}
];
`);
console.log(`grammar pages: ${links.length} exported`);
